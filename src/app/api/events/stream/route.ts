// src/app/api/events/stream/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import Redis from "ioredis";
import { addClient, removeClient, clientCount, EVENTS_CHANNEL } from "@/server/events";

function getSubscriber(): Redis | null {
  const url = process.env.UPSTASH_REDIS_URL;
  if (!url) return null;

  // ВАЖНО: для SUBSCRIBE лучше отдельный коннект (так устроен Redis)
  return new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
  });
}

function safeJson(s: unknown) {
  if (typeof s !== "string") return s;
  try {
    return JSON.parse(s);
  } catch {
    return { value: s };
  }
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const sub = getSubscriber();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (s: string) => controller.enqueue(encoder.encode(s));

      const id = crypto.randomUUID();
      let ka: ReturnType<typeof setInterval> | null = null;
      let aborted = false;

      const cleanup = async () => {
        if (aborted) return;
        aborted = true;

        if (ka) {
          clearInterval(ka);
          ka = null;
        }

        // in-memory client cleanup
        removeClient(id);

        // redis subscriber cleanup
        if (sub) {
          try {
            sub.removeAllListeners();
            await sub.quit();
          } catch {
            try {
              sub.disconnect();
            } catch {}
          }
        }

        try {
          controller.close();
        } catch {}

        req.signal.removeEventListener("abort", onAbort);
      };

      const onAbort = () => {
        void cleanup();
      };

      req.signal.addEventListener("abort", onAbort);

      // SSE basics
      send(`retry: 5000\n`);
      send(
        `event: hello\ndata: ${JSON.stringify({
          ok: true,
          clients: clientCount(),
          ts: Date.now(),
          redis: Boolean(sub),
        })}\n\n`,
      );

      // keepalive
      ka = setInterval(() => send(`: keepalive ${Date.now()}\n\n`), 15_000);

      // Если Redis TCP недоступен — fallback на in-memory (локалка/дев)
      if (!sub) {
        addClient({
          id,
          write: (chunk: string) => send(chunk),
          close: () => {
            void cleanup();
          },
        });
        return;
      }

      // Redis Pub/Sub mode
      try {
        if (sub.status === "wait") await sub.connect();
      } catch {
        // если не смогли подключиться — fallback in-memory
        addClient({
          id,
          write: (chunk: string) => send(chunk),
          close: () => {
            void cleanup();
          },
        });
        return;
      }

      sub.on("message", (_channel, message) => {
        if (aborted) return;

        const parsed = safeJson(message);
        const event = String(parsed?.event ?? "message");
        const data = parsed?.data ?? {};

        // NOTE: event.id делать необязательно; EventSource сам держит соединение.
        // Но если хочешь Last-Event-ID — можно добавить id из data.ts.
        const eid =
          typeof data?.ts === "number"
            ? `${data.ts}-${crypto.randomUUID()}`
            : `${Date.now()}-${crypto.randomUUID()}`;

        send(`id: ${eid}\n`);
        send(`event: ${event}\n`);
        send(`data: ${JSON.stringify(data)}\n\n`);
      });

      sub.on("error", () => {
        // При ошибке пусть браузер реконнектится; тут просто закроем поток.
        void cleanup();
      });

      try {
        await sub.subscribe(EVENTS_CHANNEL);
      } catch {
        void cleanup();
      }
    },
    cancel() {
      // ReadableStream cancel (на всякий)
      // abort handler тоже отработает, но пусть будет безопасно
      try {
        req.signal.dispatchEvent(new Event("abort"));
      } catch {}
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
