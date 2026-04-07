import bcrypt from "bcrypt";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import {
  generateSixDigitCode,
  logDevAuthCode,
  sha256Hex,
  upsertAuthCode,
} from "@/server/authCodes";

type PrismaLikeError = {
  code?: string;
};

export class AuthFlowHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const AUTH_CODE_TTL_MS = 15 * 60 * 1000;
const AUTH_CODE_THROTTLE_MS = 30_000;

export async function signUpWithEmail(input: {
  email: string;
  password: string;
  username: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AuthFlowHttpError(400, "User already exists");
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);
  const code = generateSixDigitCode();
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          email: input.email,
          username: input.username,
          hashedPassword,
          emailVerifiedAt: null,
          profile: { create: { displayName: input.username } },
        },
      });

      await upsertAuthCode({
        email: input.email,
        purpose: "EMAIL_VERIFY",
        code,
        expiresAt,
        db: tx,
      });
    });
  } catch (error: unknown) {
    const prismaError = error as PrismaLikeError;
    if (prismaError?.code === "P2002") {
      throw new AuthFlowHttpError(400, "User already exists");
    }
    throw error;
  }

  logDevAuthCode({ kind: "email_verify", email: input.email, code });
  return { success: true as const, needsEmailVerify: true as const };
}

export async function resendEmailVerificationCode(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerifiedAt: true },
  });

  if (!user || user.emailVerifiedAt) {
    return { ok: true as const };
  }

  const existing = await prisma.authCode.findUnique({
    where: { email_purpose: { email, purpose: "EMAIL_VERIFY" } },
    select: { createdAt: true },
  });

  if (existing && Date.now() - existing.createdAt.getTime() < AUTH_CODE_THROTTLE_MS) {
    throw new AuthFlowHttpError(429, "too_fast");
  }

  const code = generateSixDigitCode();
  await upsertAuthCode({
    email,
    purpose: "EMAIL_VERIFY",
    code,
    expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
  });

  logDevAuthCode({ kind: "email_verify_resend", email, code });
  return { ok: true as const };
}

export async function sendPasswordResetCode(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    return { ok: true as const };
  }

  const existing = await prisma.authCode.findUnique({
    where: { email_purpose: { email, purpose: "PASSWORD_RESET" } },
    select: { createdAt: true },
  });

  if (existing && Date.now() - existing.createdAt.getTime() < AUTH_CODE_THROTTLE_MS) {
    throw new AuthFlowHttpError(429, "too_fast");
  }

  const code = generateSixDigitCode();
  await upsertAuthCode({
    email,
    purpose: "PASSWORD_RESET",
    code,
    expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
  });

  logDevAuthCode({ kind: "password_reset", email, code });
  return { ok: true as const };
}

export async function verifyEmailCode(input: { email: string; code: string }) {
  const row = await prisma.authCode.findUnique({
    where: { email_purpose: { email: input.email, purpose: "EMAIL_VERIFY" } },
  });

  if (!row) throw new AuthFlowHttpError(400, "invalid_code");
  if (row.expiresAt.getTime() < Date.now()) {
    throw new AuthFlowHttpError(400, "code_expired");
  }
  if (row.tries >= 10) {
    throw new AuthFlowHttpError(429, "too_many_tries");
  }

  const valid = sha256Hex(input.code) === row.codeHash;

  await prisma.authCode.update({
    where: { email_purpose: { email: input.email, purpose: "EMAIL_VERIFY" } },
    data: { tries: { increment: 1 } },
  });

  if (!valid) {
    throw new AuthFlowHttpError(400, "invalid_code");
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.user.update({
      where: { email: input.email },
      data: { emailVerifiedAt: new Date() },
    });

    await tx.authCode.delete({
      where: { email_purpose: { email: input.email, purpose: "EMAIL_VERIFY" } },
    });
  });

  return { success: true as const };
}

export async function resetPasswordWithCode(input: {
  email: string;
  code: string;
  newPassword: string;
}) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (!user) {
    return { ok: true as const };
  }

  const row = await prisma.authCode.findUnique({
    where: { email_purpose: { email: input.email, purpose: "PASSWORD_RESET" } },
    select: { id: true, codeHash: true, expiresAt: true, tries: true },
  });

  if (!row) throw new AuthFlowHttpError(400, "invalid_code");

  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.authCode.delete({ where: { id: row.id } }).catch(() => {});
    throw new AuthFlowHttpError(400, "code_expired");
  }

  if (row.tries >= 5) {
    throw new AuthFlowHttpError(429, "too_many_tries");
  }

  const valid = sha256Hex(input.code) === row.codeHash;
  if (!valid) {
    await prisma.authCode.update({
      where: { id: row.id },
      data: { tries: { increment: 1 } },
    });
    throw new AuthFlowHttpError(400, "invalid_code");
  }

  const hashedPassword = await bcrypt.hash(input.newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { hashedPassword },
  });

  await prisma.authCode.delete({ where: { id: row.id } }).catch(() => {});

  return { ok: true as const };
}
