// src/server/events.ts
import { randomUUID } from "crypto";

// In-memory fallback (полезно для локальной разработки)
type Client = { id: string; write: (chunk: string) => void; close: () => void };

declare global {
  // eslint-disable-next-line no-var
  var __SSE_CLIENTS__: Map<string, Client> | undefined;
}
const clients: Map<string, Client> = (globalThis.__SSE_CLIENTS__ ??= new Map());

export function addClient(c: Client) { clients.set(c.id, c); }
export function removeClient(id: string) { clients.delete(id); }
export function clientCount() { return clients.size; }

// Redis Stream (источник истины на проде)
// Требует @upstash/redis и переменные окружения Upstash (fromEnv)
let redis: any = null;
let redisReady = false;

async function getRedis() {
  if (redisReady) return redis;
  redisReady = true;

  try {
    const mod = await import("@upstash/redis");
    // Типы у SDK нормальные, ts-expect-error не нужен
    redis = mod.Redis.fromEnv();
  } catch {
    redis = null;
  }
  return redis;
}

export const EVENTS_STREAM_KEY = "sse:events";

/**
 * emit — публикует событие:
 * 1) На проде: в Redis Stream (чтобы все инстансы Vercel видели события)
 * 2) Fallback: в in-memory клиентов (локалка)
 */
export async function emit(event: string, payload: unknown) {
  const now = Date.now();
  const data = { type: event, ts: now, ...((payload as any) ?? {}) };

  // 1) Redis Stream
  const r = await getRedis();
  if (r) {
    // XADD sse:events * event "<name>" data "<json>"
    await r.xadd(EVENTS_STREAM_KEY, "*", {
      event,
      data: JSON.stringify(data),
    });
  }

  // 2) In-memory fallback (и удобно для дев-окружений)
  const msg =
    `id: ${now}-${randomUUID()}\n` +
    `event: ${event}\n` +
    `data: ${JSON.stringify(data)}\n\n`;

  for (const c of clients.values()) {
    try { c.write(msg); } catch { /* ignore */ }
  }
}
