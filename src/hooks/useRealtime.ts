// src/hooks/useRealtime.ts
"use client";

import { useEventStream, type HandlerMap } from "@/features/realtime/client/useEventStream";

type UseRealtimeOptions = {
  /** Проксирует topic в query-параметр (если когда-нибудь понадобится) */
  topic?: string;
  query?: Record<string, string | number | boolean | undefined>;
  withCredentials?: boolean;
  url?: string;
  onOpen?: () => void;
  onError?: (e: unknown) => void;
};

type RealtimePayload = unknown;
type RealtimeHandler = (payload: RealtimePayload) => void;

/**
 * Простая обёртка над useEventStream для подписки на именованные события SSE.
 *
 * Примеры:
 *   useRealtime("chapter:new_post", (p) => {...})
 *   useRealtime(["arc:created", "arc:updated"], (p) => {...})
 */
export function useRealtime(
  eventNames: string[] | string,
  handler: RealtimeHandler,
  opts: UseRealtimeOptions = {},
) {
  const names = Array.isArray(eventNames) ? eventNames : [eventNames];

  const handlers: HandlerMap = {};
  for (const name of names) {
    handlers[name] = handler;
  }

  // Вся тяжёлая логика — внутри useEventStream:
  // - один EventSource
  // - JSON parse
  // - topic/query/url/withCredentials
  useEventStream(handlers, opts);
}
