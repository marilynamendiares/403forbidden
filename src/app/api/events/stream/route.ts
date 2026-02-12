// src/app/api/events/stream/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { addClient, removeClient, clientCount, EVENTS_STREAM_KEY } from "@/server/events";

async function getRedis() {
  try {
    const mod = await import("@upstash/redis");
    return mod.Redis.fromEnv();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const redis = await getRedis();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (s: string) => controller.enqueue(encoder.encode(s));
      const id = crypto.randomUUID();

      let ka: ReturnType<typeof setInterval> | null = null;
      let aborted = false;

      const onAbort = () => {
        aborted = true;
        if (ka) { clearInterval(ka); ka = null; }
        removeClient(id);
        try { controller.close(); } catch {}
        req.signal.removeEventListener("abort", onAbort);
      };

      req.signal.addEventListener("abort", onAbort);

      // подсказка клиенту по реконнекту
      send(`retry: 5000\n`);

      // hello (для дебага)
      send(
        `event: hello\ndata: ${JSON.stringify({
          ok: true,
          clients: clientCount(),
          ts: Date.now(),
          redis: Boolean(redis),
        })}\n\n`,
      );

      // keepalive
      ka = setInterval(() => send(`: keepalive ${Date.now()}\n\n`), 15_000);

      // Если Redis недоступен — fallback на старое поведение (in-memory)
      if (!redis) {
        addClient({
          id,
          write: (chunk: string) => send(chunk),
          close: () => {
            try { controller.close(); } catch {}
            req.signal.removeEventListener("abort", onAbort);
          },
        });
        return;
      }

      // Redis mode: читаем события из Stream и пушим в SSE
      // EventSource при реконнекте шлёт Last-Event-ID если мы посылаем id:
      let lastId = req.headers.get("last-event-id") || "$";

      // Если это первый коннект (нет last-event-id), можно начать с "$" (только новые)
      // Если хочешь "догонять последние", заменим на "0-0" и введём лимит — сделаем позже.
      while (!aborted) {
        try {
          // XREAD BLOCK 20000 STREAMS sse:events <lastId>
          const res = await redis.xread(
  EVENTS_STREAM_KEY,
  lastId,
  { blockMS: 20000, count: 100 }
);
          if (!res) continue;

          // формат Upstash: [ [ streamKey, [ [id, {event, data}], ... ] ] ]
const streams = Array.isArray(res) ? res : [res];

for (const stream of streams as any[]) {
  const entries = stream?.messages ?? stream?.[1] ?? [];
  for (const msg of entries as any[]) {
    const entryId = msg?.id ?? msg?.[0];
    const fields = msg?.message ?? msg?.[1] ?? {};

    if (!entryId) continue;
    lastId = entryId;

    const event = fields?.event ?? "message";
    const dataRaw = fields?.data ?? "{}";

    send(`id: ${entryId}\n`);
    send(`event: ${event}\n`);
    send(`data: ${dataRaw}\n\n`);
  }
}
        } catch {
          // не рвём поток — просто продолжим, keepalive удержит соединение
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
