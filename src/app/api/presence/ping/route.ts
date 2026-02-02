// src/app/api/presence/ping/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

const redis = Redis.fromEnv();

// how long user is considered "connected" without pings
const PRESENCE_TTL_SECONDS = 120;
// write lastSeenAt to DB at most once per 10 min
const LAST_SEEN_THROTTLE_MS = 10 * 60 * 1000;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const userId = session.user.id;

  // 1) presence in redis (connected)
  const key = `presence:user:${userId}`;
  const now = Date.now();

  await redis.set(
    key,
    JSON.stringify({ userId, lastPingAt: now }),
    { ex: PRESENCE_TTL_SECONDS }
  );

  // keep a lightweight online index
  await redis.sadd("presence:online", userId);

  // 2) update lastSeenAt in DB with throttling (avoid spamming Postgres)
  const throttleKey = `presence:lastseen:${userId}`;
  const canWrite = await redis.set(throttleKey, "1", { nx: true, px: LAST_SEEN_THROTTLE_MS });

  if (canWrite) {
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
