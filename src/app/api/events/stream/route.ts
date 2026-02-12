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

      // keepalive
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
      let lastId = headerLast && headerLast.length > 0 ? headerLast : "$";

      while (!aborted) {
        try {
          const res = await (redis as any).xread(
            EVENTS_STREAM_KEY,
            lastId,
            { blockMS: 20000, count: 100 },
          );
          if (!res) continue;

          const streams = Array.isArray(res) ? res : [res];

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
                  for (let i = 0; i < fields.length; i += 2) o[fields[i]] = fields[i + 1];
                  fields = o;
                } else {
                  fields = Object.fromEntries(fields);
                }
              }

              if (!entryId) continue;
              lastId = entryId;

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

              send(`id: ${entryId}\n`);
              send(`event: ${event}\n`);
              send(`data: ${dataRaw}\n\n`);
            }
          }
        } catch {
          // keepalive keeps the connection alive; EventSource will reconnect if needed
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
