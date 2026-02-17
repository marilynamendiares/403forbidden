// src/server/events.ts
import { randomUUID } from "crypto";
import Redis from "ioredis";

// In-memory fallback (полезно для локальной разработки)
type Client = { id: string; write: (chunk: string) => void; close: () => void };

declare global {
  // eslint-disable-next-line no-var
  var __SSE_CLIENTS__: Map<string, Client> | undefined;

  // eslint-disable-next-line no-var
  var __PUBSUB_REDIS__: Redis | undefined;
}

const clients: Map<string, Client> = (globalThis.__SSE_CLIENTS__ ??= new Map());

export function addClient(c: Client) {
  clients.set(c.id, c);
}
export function removeClient(id: string) {
  clients.delete(id);
}
export function clientCount() {
  return clients.size;
}

// Канал для pub/sub
export const EVENTS_CHANNEL = "sse:pubsub";

/**
 * Единственный shared TCP Redis клиент для publish (и других server-side целей).
 * Важно: ioredis должен жить "глобально", чтобы не создавать коннекты на каждый вызов.
 */
function getPubSubRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_URL;
  if (!url) return null;

  if (!globalThis.__PUBSUB_REDIS__) {
    globalThis.__PUBSUB_REDIS__ = new Redis(url, {
      // Upstash/TLS: rediss:// уже включает TLS
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
    });
  }
  return globalThis.__PUBSUB_REDIS__!;
}

function sseFrame(event: string, data: unknown, id?: string) {
  const now = Date.now();
  const eid = id ?? `${now}-${randomUUID()}`;
  return (
    `id: ${eid}\n` +
    `event: ${event}\n` +
    `data: ${JSON.stringify(data ?? {})}\n\n`
  );
}

/**
 * emit — публикует событие:
 * 1) в in-memory SSE клиентов (локально + текущий инстанс)
 * 2) в Redis Pub/Sub (чтобы другие инстансы Vercel тоже получили)
 *
 * Никаких Streams/XREAD → idle не жрёт reads.
 */
export async function emit(event: string, payload: unknown) {
  const now = Date.now();
  const data = { type: event, ts: now, ...((payload as any) ?? {}) };

  // 1) In-memory fanout (текущий инстанс)
  const msg = sseFrame(event, data);
  for (const c of clients.values()) {
    try {
      c.write(msg);
    } catch {
      /* ignore */
    }
  }

  // 2) Redis Pub/Sub (все инстансы)
  const r = getPubSubRedis();
  if (!r) return;

  try {
    if (r.status === "end") return;
    if (r.status === "wait") await r.connect();
    await r.publish(
      EVENTS_CHANNEL,
      JSON.stringify({ event, data })
    );
  } catch {
    // не ломаем основной сценарий
  }
}
