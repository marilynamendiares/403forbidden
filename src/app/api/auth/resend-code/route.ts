export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/server/db";

// если у тебя уже есть нормальный мейлер — замени реализацию тут
async function sendEmailVerificationCode(email: string, code: string) {
  console.log("[DEV] resend email verify code to", email, ":", code);
}

function gen6() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}
function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").toLowerCase().trim();

  if (!email) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // Не палим, существует ли email (безопаснее): отвечаем ok почти всегда
  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerifiedAt: true },
  });

  // если юзера нет — тоже ok (не раскрываем)
  if (!user) return NextResponse.json({ ok: true });

  // если уже verified — тоже ok
  if (user.emailVerifiedAt) return NextResponse.json({ ok: true });

  // анти-спам: не чаще, чем раз в 30 секунд
  const existing = await prisma.authCode.findUnique({
    where: { email_purpose: { email, purpose: "EMAIL_VERIFY" } },
    select: { createdAt: true, expiresAt: true },
  });

  if (existing && Date.now() - existing.createdAt.getTime() < 30_000) {
    return NextResponse.json({ error: "too_fast" }, { status: 429 });
  }

  const code = gen6();
  const codeHash = sha256(code);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.authCode.upsert({
    where: { email_purpose: { email, purpose: "EMAIL_VERIFY" } },
    update: { codeHash, expiresAt, tries: 0, createdAt: new Date() },
    create: { email, purpose: "EMAIL_VERIFY", codeHash, expiresAt },
  });

  await sendEmailVerificationCode(email, code);

  return NextResponse.json({ ok: true });
}
