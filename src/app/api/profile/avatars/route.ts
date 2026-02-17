export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { coerceMediaKey } from "@/lib/media";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const items = await prisma.userAvatar.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, key: true, createdAt: true },
  });

  return NextResponse.json({
    items: items.map((a) => ({
      id: a.id,
      key: coerceMediaKey(a.key) ?? a.key,
      createdAt: a.createdAt,
    })),
  });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return new NextResponse("Missing id", { status: 400 });

  const av = await prisma.userAvatar.findFirst({
    where: { id, userId },
    select: { id: true, key: true },
  });
  if (!av) return new NextResponse("Not found", { status: 404 });

  // если эта аватарка сейчас активна — сбрасываем в профиле
  const prof = await prisma.profile.findUnique({
    where: { userId },
    select: { avatarUrl: true },
  });
  const activeKey = coerceMediaKey(prof?.avatarUrl) ?? null;
  const delKey = coerceMediaKey(av.key) ?? av.key;

  await prisma.$transaction([
    prisma.userAvatar.delete({ where: { id: av.id } }),
    ...(activeKey === delKey
      ? [prisma.profile.update({ where: { userId }, data: { avatarUrl: null } })]
      : []),
  ]);

  return new NextResponse(null, { status: 204 });
}
