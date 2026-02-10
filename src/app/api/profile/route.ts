// src/app/api/profile/route.ts
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";
import { z } from "zod";

/* ── validation ─────────────────────────────────────────────────────────── */
const PatchSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(64),
  bio: z.string().trim().max(1000).optional(),
  avatarUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
});

// аварийный генератор username (теоретически не нужен после миграции)
function randomUsername(base?: string) {
  const head =
    base?.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16) || "user";
  const tail = Math.random().toString(36).slice(2, 8);
  return `${head}${tail}`;
}

/**
 * Нормализуем URL так, чтобы:
 * - НЕ ломать "https://"
 * - чинить "https:/..." -> "https://..."
 * - если URL парсится как полноценный, чистим повторные слэши только в pathname
 */
function normalizeUrl(u?: string | null) {
  const s0 = (u ?? "").trim();
  if (!s0) return null;

  // FIX: "https:/example.com" -> "https://example.com"
  let s = s0
    .replace(/^https:\/(?!\/)/i, "https://")
    .replace(/^http:\/(?!\/)/i, "http://");

  // Если это абсолютный URL — чистим только pathname, не трогая протокол
  try {
    const url = new URL(s);
    // схлопываем // только в pathname
    url.pathname = url.pathname.replace(/\/{2,}/g, "/");

    // твои спец-фиксы
    url.pathname = url.pathname.replace("/public/public/", "/public/");

    return url.toString();
  } catch {
    // Если это не абсолютный URL (вдруг), применим аккуратный локальный фикс
    // (не трогаем 'https://', т.к. его уже починили выше)
    s = s.replace(/\/{2,}/g, "/");
    s = s.replace("/public/public/", "/public/");
    return s;
  }
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
    },
  });
  if (!me) return new NextResponse("Not found", { status: 404 });

  return NextResponse.json({
    username: me.username,
    displayName: me.profile?.displayName ?? me.username,
    bio: me.profile?.bio ?? null,
    avatarUrl: normalizeUrl(me.profile?.avatarUrl),
    bannerUrl: normalizeUrl(me.profile?.bannerUrl),
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
          avatarUrl: normalizeUrl(avatarUrl) ?? undefined,
          bannerUrl: normalizeUrl(bannerUrl) ?? undefined,
        },
        create: {
          userId,
          displayName,
          bio: typeof bio === "string" ? bio : "",
          avatarUrl: normalizeUrl(avatarUrl),
          bannerUrl: normalizeUrl(bannerUrl),
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

      return NextResponse.json({
        username: fresh!.username,
        displayName: updatedProfile.displayName,
        bio: updatedProfile.bio,
        avatarUrl: normalizeUrl(updatedProfile.avatarUrl),
        bannerUrl: normalizeUrl(updatedProfile.bannerUrl),
        user: { id: fresh!.id, email: fresh!.email },
      });
    } catch {
      // мягкий ретрай на случай гонки
    }
  }

  return new NextResponse("Could not save profile", { status: 500 });
}
