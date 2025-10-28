// src/app/api/events/stream/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { addClient, removeClient, clientCount } from "@/server/events";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (s: string) => controller.enqueue(encoder.encode(s));

      const id = crypto.randomUUID();

      // клиент записывает СТРОКИ вида "event: x\ndata: {...}\n\n"
      addClient({
        id,
        write: (chunk: string) => send(chunk),
        close: () => {
          try { controller.close(); } catch {}
        },
      });

      // стартовое сообщение, чтобы сразу увидеть активность
      send(`event: hello\ndata: ${JSON.stringify({ ok: true, clients: clientCount() })}\n\n`);

      // keepalive-комментарии каждые 15с
      const ka = setInterval(() => send(`: keepalive ${Date.now()}\n\n`), 15_000);

      // отписка/cleanup при разрыве соединения
      const onAbort = () => {
        clearInterval(ka);
        removeClient(id);
        try { controller.close(); } catch {}
      };
      req.signal.addEventListener("abort", onAbort);
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
