import { prisma } from "@/server/db";
import { redis } from "@/server/redis";

const PRESENCE_TTL_SECONDS = 120;
const LAST_SEEN_THROTTLE_MS = 10 * 60 * 1000;
const PRESENCE_ONLINE_SET_KEY = "presence:online";

function presenceUserKey(userId: string) {
  return `presence:user:${userId}`;
}

function presenceLastSeenThrottleKey(userId: string) {
  return `presence:lastseen:${userId}`;
}

export async function recordPresencePing(userId: string) {
  const now = Date.now();

  const [, , canWrite] = await Promise.all([
    redis.set(
      presenceUserKey(userId),
      JSON.stringify({ userId, lastPingAt: now }),
      { ex: PRESENCE_TTL_SECONDS }
    ),
    redis.sadd(PRESENCE_ONLINE_SET_KEY, userId),
    redis.set(
      presenceLastSeenThrottleKey(userId),
      "1",
      { nx: true, px: LAST_SEEN_THROTTLE_MS }
    ),
  ]);

  if (canWrite) {
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
  }

  return { ok: true as const };
}

export async function listOnlineUserIds() {
  const candidates = ((await redis.smembers(PRESENCE_ONLINE_SET_KEY)) as string[]) ?? [];
  if (!candidates.length) {
    return [];
  }

  const values = await redis.mget<(string | null)[]>(
    ...candidates.map((userId) => presenceUserKey(userId))
  );

  const onlineUserIds: string[] = [];
  const staleUserIds: string[] = [];

  for (let i = 0; i < candidates.length; i += 1) {
    const userId = candidates[i]!;
    const value = values?.[i] ?? null;
    if (value) onlineUserIds.push(userId);
    else staleUserIds.push(userId);
  }

  if (staleUserIds.length > 0) {
    await redis.srem(PRESENCE_ONLINE_SET_KEY, ...staleUserIds);
  }

  return onlineUserIds;
}
