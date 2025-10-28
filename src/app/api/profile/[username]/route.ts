// src/app/api/profile/[username]/route.ts
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type Ctx = { params: Promise<{ username: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { username } = await params;

  if (!username) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { username },
    select: {
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      bannerUrl: true,
      user: {
        select: { id: true },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json(profile);
}
