// src/app/api/events/stream/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import {
  addClient,
  removeClient,
  clientCount,
  EVENTS_STREAM_KEY,
} from "@/server/events";

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
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      const id = crypto.randomUUID();

      let ka: ReturnType<typeof setInterval> | null = null;
      let aborted = false;

      const onAbort = () => {
        aborted = true;
        if (ka) {
          clearInterval(ka);
          ka = null;
        }
        removeClient(id);
        try {
          controller.close();
        } catch {}
        req.signal.removeEventListener("abort", onAbort);
      };

      req.signal.addEventListener("abort", onAbort);

      // client reconnect hint
      send(`retry: 5000\n`);

      // hello (debug-friendly but harmless)
      send(
        `event: hello\ndata: ${JSON.stringify({
          ok: true,
          clients: clientCount(),
          ts: Date.now(),
          redis: Boolean(redis),
        })}\n\n`,
      );

      // keepalive (comment line)
      ka = setInterval(() => send(`: keepalive ${Date.now()}\n\n`), 15_000);

      // In-memory fallback (local/dev)
      if (!redis) {
        addClient({
          id,
          write: (chunk: string) => send(chunk),
          close: () => {
            try {
              controller.close();
            } catch {}
            req.signal.removeEventListener("abort", onAbort);
          },
        });
        return;
      }

      // Redis mode
      // If this is a reconnect, browser may send Last-Event-ID
      const headerLast = req.headers.get("last-event-id");
      // "$" = only new entries; "0-0" would replay from start (DON'T)
      let lastId =
        headerLast && headerLast.length > 0 ? String(headerLast) : "$";

      // Backoff to avoid hammering Upstash (REST xread does not block)
      let backoffMs = 250; // start
      const BACKOFF_MAX = 5000; // max 5s

      while (!aborted) {
        try {
          // NOTE: Upstash REST does NOT support blocking reads like Redis TCP does.
          // So we explicitly backoff when there are no messages.
          const res = await (redis as any).xread(EVENTS_STREAM_KEY, lastId, {
            count: 100,
          });

          const streams = Array.isArray(res) ? res : res ? [res] : [];
          let pushed = 0;

          for (const stream of streams as any[]) {
            const entries = stream?.messages ?? stream?.[1] ?? [];

            for (const msg of entries as any[]) {
              const entryId = msg?.id ?? msg?.[0];
              let fields: any = msg?.message ?? msg?.[1] ?? {};

              // Upstash can return fields as:
              // 1) object: { event: "...", data: "..." }
              // 2) array of pairs: [["event","..."],["data","..."]]
              // 3) flat array: ["event","...","data","..."]
              if (Array.isArray(fields)) {
                if (fields.length && typeof fields[0] === "string") {
                  const o: any = {};
                  for (let i = 0; i < fields.length; i += 2) {
                    o[fields[i]] = fields[i + 1];
                  }
                  fields = o;
                } else {
                  fields = Object.fromEntries(fields);
                }
              }

              if (!entryId) continue;
              lastId = String(entryId);

              const event = fields?.event ?? "message";

              // Ensure `data:` is always a JSON string
              let dataRaw = "{}";
              if (fields?.data === undefined || fields?.data === null) {
                dataRaw = "{}";
              } else if (typeof fields.data === "string") {
                const s = fields.data.trim();
                if (
                  (s.startsWith("{") && s.endsWith("}")) ||
                  (s.startsWith("[") && s.endsWith("]"))
                ) {
                  dataRaw = s;
                } else {
                  dataRaw = JSON.stringify({ value: fields.data });
                }
              } else {
                dataRaw = JSON.stringify(fields.data);
              }

              send(`id: ${lastId}\n`);
              send(`event: ${event}\n`);
              send(`data: ${dataRaw}\n\n`);
              pushed++;
            }
          }

          // If nothing arrived, slow down polling
          if (pushed === 0) {
            const jitter = Math.floor(Math.random() * 150); // 0..149ms
            await sleep(backoffMs + jitter);
            backoffMs = Math.min(Math.floor(backoffMs * 1.5), BACKOFF_MAX);
          } else {
            // Messages received -> reset backoff for low latency
            backoffMs = 250;
          }
        } catch {
          // On errors: don't spin — backoff a bit
          const jitter = Math.floor(Math.random() * 250); // 0..249ms
          await sleep(Math.min(backoffMs, BACKOFF_MAX) + jitter);
          backoffMs = Math.min(Math.floor(backoffMs * 1.5), BACKOFF_MAX);
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
