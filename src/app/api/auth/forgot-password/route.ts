export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/server/db";

async function sendPasswordResetCode(email: string, code: string) {
  // TODO: заменить на реальный email provider
  console.log("[DEV] password reset code to", email, ":", code);
}

function gen6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").toLowerCase().trim();

  if (!email) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // ВАЖНО: не раскрываем, существует ли email
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ ok: true });

  // анти-спам: не чаще, чем раз в 30 секунд
  const existing = await prisma.authCode.findUnique({
    where: { email_purpose: { email, purpose: "PASSWORD_RESET" } },
    select: { createdAt: true },
  });
  if (existing && Date.now() - existing.createdAt.getTime() < 30_000) {
    return NextResponse.json({ error: "too_fast" }, { status: 429 });
  }

  const code = gen6();
  const codeHash = sha256(code);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.authCode.upsert({
    where: { email_purpose: { email, purpose: "PASSWORD_RESET" } },
    update: { codeHash, expiresAt, tries: 0, createdAt: new Date() },
    create: { email, purpose: "PASSWORD_RESET", codeHash, expiresAt },
  });

  await sendPasswordResetCode(email, code);

  return NextResponse.json({ ok: true });
}
