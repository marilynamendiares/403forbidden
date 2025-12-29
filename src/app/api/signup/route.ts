import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "@/server/db";

function gen6() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

// TODO: подключим реальную отправку (Resend/SMTP). Пока заглушка.
async function sendEmailVerificationCode(email: string, code: string) {
  console.log("[DEV] email verify code to", email, ":", code);
}


export async function POST(req: Request) {
  try {
    const { email, password, username } = await req.json();

    if (!email || !password || !username) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // опционально: быстрый предварительный чек
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const code = gen6();
    const codeHash = sha256(code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          email,
          username, // у тебя username в User обязательный
          hashedPassword,
          emailVerifiedAt: null,
          profile: { create: { displayName: username } },
        },
      });

      await tx.authCode.upsert({
        where: { email_purpose: { email, purpose: "EMAIL_VERIFY" } },
        update: { codeHash, expiresAt, tries: 0, createdAt: new Date() },
        create: { email, purpose: "EMAIL_VERIFY", codeHash, expiresAt },
      });
    });

    await sendEmailVerificationCode(email, code);

    return NextResponse.json({ success: true, needsEmailVerify: true });


    return NextResponse.json({ success: true });
  } catch (err: any) {
    // Prisma: уникальный индекс (например, двойной клик)
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
