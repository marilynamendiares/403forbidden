import crypto from "crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db";
import { randomNumericCode } from "@/server/random";

export function generateSixDigitCode() {
  return randomNumericCode(6);
}

export function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function upsertAuthCode(input: {
  email: string;
  purpose: "EMAIL_VERIFY" | "PASSWORD_RESET";
  code: string;
  expiresAt: Date;
  db?: PrismaClient | Prisma.TransactionClient;
}) {
  const codeHash = sha256Hex(input.code);
  const db = input.db ?? prisma;

  return db.authCode.upsert({
    where: { email_purpose: { email: input.email, purpose: input.purpose } },
    update: { codeHash, expiresAt: input.expiresAt, tries: 0, createdAt: new Date() },
    create: {
      email: input.email,
      purpose: input.purpose,
      codeHash,
      expiresAt: input.expiresAt,
    },
  });
}

export function logDevAuthCode(input: {
  kind: "email_verify" | "email_verify_resend" | "password_reset";
  email: string;
  code: string;
}) {
  const labelByKind = {
    email_verify: "email verify code",
    email_verify_resend: "resend email verify code",
    password_reset: "password reset code",
  } as const;

  console.info(`[DEV] ${labelByKind[input.kind]} for ${input.email}: ${input.code}`);
}
