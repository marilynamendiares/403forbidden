// src/server/redis.ts
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const CHAPTER_LOCK_TTL_SEC = 180; // 3 минуты
export const chapterLockKey = (chapterId: string) => `lock:chapter:${chapterId}`;
