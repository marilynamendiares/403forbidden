// src/hooks/useEventStream.ts
"use client";
import { useEffect } from "react";

type HandlerMap = Partial<Record<string, (data: any) => void>>;

export function useEventStream(handlers: HandlerMap) {
  useEffect(() => {
    const es = new EventSource("/api/events/stream", { withCredentials: true });

    const onMessage = (ev: MessageEvent) => {
      // default 'message' event — если будем слать без имени
      try {
        const data = JSON.parse(ev.data);
        handlers["message"]?.(data);
      } catch {}
    };

    es.onmessage = onMessage;

    // named events
    const names = Object.keys(handlers).filter((n) => n !== "message");
    const named = names.map((name) => {
      const fn = (e: MessageEvent) => {
        try {
          handlers[name]?.(JSON.parse(e.data));
        } catch {}
      };
      es.addEventListener(name, fn as EventListener);
      return { name, fn };
    });

    es.onerror = () => {
      // простая стратегия: закрыть; браузер переподключится
      es.close();
    };

    return () => {
      named.forEach(({ name, fn }) => es.removeEventListener(name, fn as EventListener));
      es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
