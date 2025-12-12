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

      // держим ссылку, чтобы корректно чистить keepalive
      let ka: ReturnType<typeof setInterval> | null = null;

      const onAbort = () => {
        if (ka) {
          clearInterval(ka);
          ka = null;
        }
        removeClient(id);
        try {
          controller.close();
        } catch {}
        // снимаем слушатель, чтобы исключить утечки
        req.signal.removeEventListener("abort", onAbort);
      };

      // рекомендуемый интервал автопереподключения клиенту (мс)
      send(`retry: 5000\n`);

      // регистрируем клиента — сервер будет писать уже готовые SSE-строки:
      // "event: <name>\n" + "data: <json>\n\n"
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

      // стартовое сообщение, полезно для мониторинга
      send(
        `event: hello\ndata: ${JSON.stringify({
          ok: true,
          clients: clientCount(),
          ts: Date.now(),
        })}\n\n`,
      );

      // keepalive-комментарии — помогают прокси не закрывать поток
      ka = setInterval(() => send(`: keepalive ${Date.now()}\n\n`), 15_000);

      // корректный cleanup при разрыве соединения
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
