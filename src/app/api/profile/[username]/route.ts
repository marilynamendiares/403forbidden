// src/app/api/profile/[username]/route.ts
export const runtime = "nodejs";

import { prisma } from "@/server/db";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type Ctx = { params: Promise<{ username: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { username } = await params;

  if (!username) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 });
  }

  // username теперь хранится в User
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      profile: {
        select: {
          displayName: true,
          bio: true,
          avatarUrl: true,
          bannerUrl: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Сохраняем прежний формат ответа (топ-левел профильные поля + user.id)
  const payload = {
    username: user.username,
    displayName: user.profile?.displayName ?? user.username,
    bio: user.profile?.bio ?? null,
    avatarUrl: user.profile?.avatarUrl ?? null,
    bannerUrl: user.profile?.bannerUrl ?? null,
    user: { id: user.id },
  };

  return NextResponse.json(payload);
}
