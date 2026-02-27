// src/app/api/profile/route.ts
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { coerceMediaKey } from "@/lib/media";

/* ── validation ─────────────────────────────────────────────────────────── */
/**
 * ВАЖНО:
 * avatarUrl/bannerUrl принимаем как string, потому что:
 * - может прийти key ("avatars/...")
 * - может прийти абсолютный URL (legacy)
 * - может прийти "/api/uploads/images?key=..." (если кто-то так сохранит)
 * Мы всё приводим к key через coerceMediaKey().
 */
const PatchSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(64),
  bio: z.string().trim().max(1000).optional(),
  avatarUrl: z.string().trim().max(2048).optional(),
  bannerUrl: z.string().trim().max(2048).optional(),
});

// аварийный генератор username (теоретически не нужен после миграции)
function randomUsername(base?: string) {
  const head =
    base?.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16) || "user";
  const tail = Math.random().toString(36).slice(2, 8);
  return `${head}${tail}`;
}

/* ── GET /api/profile  → профиль текущего юзера ────────────────────────── */
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      profile: {
        select: {
          displayName: true,
          bio: true,
          avatarUrl: true,
          bannerUrl: true,
        },
      },
      wallet: {
        select: {
          eurodollars: true,
        },
      },
    },
  });
  if (!me) return new NextResponse("Not found", { status: 404 });

  // ✅ ВОЗВРАЩАЕМ KEY (а не URL)
  return NextResponse.json({
    username: me.username,
    displayName: me.profile?.displayName ?? me.username,
    bio: me.profile?.bio ?? null,
    avatarUrl: coerceMediaKey(me.profile?.avatarUrl) ?? null,
    bannerUrl: coerceMediaKey(me.profile?.bannerUrl) ?? null,
    eurodollars: me.wallet?.eurodollars ?? 0,
    user: { id: me.id, email: me.email },
  });
}

/* ── PATCH /api/profile  → обновление профиля ──────────────────────────── */
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return new NextResponse(msg, { status: 400 });
  }

  const { displayName, bio, avatarUrl, bannerUrl } = parsed.data;

  // ✅ Нормализация ТОЛЬКО в KEY
  const avatarKey = avatarUrl !== undefined ? (coerceMediaKey(avatarUrl) ?? null) : undefined;
  const bannerKey = bannerUrl !== undefined ? (coerceMediaKey(bannerUrl) ?? null) : undefined;

  // гарантия, что у User есть username (должен быть после миграции)
  for (let i = 0; i < 3; i++) {
    try {
      const me = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true },
      });
      if (!me) return new NextResponse("User not found", { status: 404 });

      if (!me.username || me.username.length < 3) {
        await prisma.user.update({
          where: { id: userId },
          data: { username: randomUsername(displayName) },
        });
      }

      const updatedProfile = await prisma.profile.upsert({
        where: { userId },
        update: {
          displayName,
          bio: typeof bio === "string" ? bio : undefined,
          ...(avatarKey !== undefined ? { avatarUrl: avatarKey } : {}),
          ...(bannerKey !== undefined ? { bannerUrl: bannerKey } : {}),
        },
        create: {
          userId,
          displayName,
          bio: typeof bio === "string" ? bio : "",
          avatarUrl: avatarKey ?? null,
          bannerUrl: bannerKey ?? null,
        },
        select: {
          displayName: true,
          bio: true,
          avatarUrl: true,
          bannerUrl: true,
        },
      });

      const fresh = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, username: true },
      });

      // ✅ ВОЗВРАЩАЕМ KEY (а не URL)
      return NextResponse.json({
        username: fresh!.username,
        displayName: updatedProfile.displayName,
        bio: updatedProfile.bio,
        avatarUrl: coerceMediaKey(updatedProfile.avatarUrl) ?? null,
        bannerUrl: coerceMediaKey(updatedProfile.bannerUrl) ?? null,
        user: { id: fresh!.id, email: fresh!.email },
      });
    } catch {
      // мягкий ретрай на случай гонки
    }
  }

  return new NextResponse("Could not save profile", { status: 500 });
}
