import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/server/db";

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

    await prisma.user.create({
      data: {
        email,
        hashedPassword,
        profile: {
          create: { username, displayName: username },
        },
      },
    });

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
