export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/server/db";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").toLowerCase().trim();
  const code = String(body?.code ?? "").trim();

  if (!email || code.length < 4) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const row = await prisma.authCode.findUnique({
    where: { email_purpose: { email, purpose: "EMAIL_VERIFY" } },
  });

  if (!row) return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  if (row.expiresAt.getTime() < Date.now())
    return NextResponse.json({ error: "code_expired" }, { status: 400 });
  if (row.tries >= 10)
    return NextResponse.json({ error: "too_many_tries" }, { status: 429 });

  const ok = sha256(code) === row.codeHash;

  await prisma.authCode.update({
    where: { email_purpose: { email, purpose: "EMAIL_VERIFY" } },
    data: { tries: { increment: 1 } },
  });

  if (!ok) return NextResponse.json({ error: "invalid_code" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } });
    await tx.authCode.delete({ where: { email_purpose: { email, purpose: "EMAIL_VERIFY" } } });
  });

  return NextResponse.json({ success: true });
}
