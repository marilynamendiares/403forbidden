export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { prisma } from "@/server/db";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").toLowerCase().trim();
  const code = String(body?.code ?? "").trim();
  const newPassword = String(body?.newPassword ?? "");

  if (!email || !code || newPassword.length < 6) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  // не раскрываем существование email
  if (!user) return NextResponse.json({ ok: true });

  const row = await prisma.authCode.findUnique({
    where: { email_purpose: { email, purpose: "PASSWORD_RESET" } },
    select: { id: true, codeHash: true, expiresAt: true, tries: true },
  });

  // тоже не раскрываем детали
  if (!row) return NextResponse.json({ error: "invalid_code" }, { status: 400 });

  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.authCode.delete({ where: { id: row.id } }).catch(() => {});
    return NextResponse.json({ error: "code_expired" }, { status: 400 });
  }

  if (row.tries >= 5) {
    return NextResponse.json({ error: "too_many_tries" }, { status: 429 });
  }

  const ok = sha256(code) === row.codeHash;
  if (!ok) {
    await prisma.authCode.update({
      where: { id: row.id },
      data: { tries: { increment: 1 } },
    });
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { hashedPassword },
  });

  // одноразовый код — удаляем
  await prisma.authCode.delete({ where: { id: row.id } }).catch(() => {});

  return NextResponse.json({ ok: true });
}
