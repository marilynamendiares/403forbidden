// src/app/api/presence/list/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

const redis = Redis.fromEnv();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // MVP: читаем все ключи presence:user:*
  // На больших масштабах это поменяем на set/sorted-set, но сейчас норм.
    const candidates = ((await redis.smembers("presence:online")) as string[]) ?? [];
  if (!candidates.length) {
    return NextResponse.json({ ok: true, onlineUserIds: [] });
  }

  // Check which candidates still have an active TTL key; clean up stale ids
  const presenceKeys = candidates.map((id: string) => `presence:user:${id}`);
  const values = await redis.mget<(string | null)[]>(...presenceKeys);

  const onlineUserIds: string[] = [];
  const staleUserIds: string[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const userId = candidates[i]!;
    const v = values?.[i] ?? null;
    if (v) onlineUserIds.push(userId);
    else staleUserIds.push(userId);
  }

  if (staleUserIds.length) {
    await redis.srem("presence:online", ...staleUserIds);
  }

  return NextResponse.json({ ok: true, onlineUserIds });
}
