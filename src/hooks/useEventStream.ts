// src/hooks/useEventStream.ts
"use client";

import { useEffect, useMemo, useRef } from "react";

/**
 * Карта обработчиков:
 * - ключ "message" — обработчик дефолтного события (без имени)
 * - любые другие ключи — именованные события (event: <name>)
 * - если сервер шлёт default-события формата { type: string, ... },
 *   хук сам пробросит их в handlers[type], если такой есть.
 */
export type HandlerMap = Partial<Record<string, (data: any) => void>>;

type UseEventStreamOptions = {
  /** Если бэкенд поддерживает подписку по топику (?topic=notify:user:<id>) */
  topic?: string;
  /** Доп. query-параметры к /api/events/stream */
  query?: Record<string, string | number | boolean | undefined>;
  /** Прокинуть withCredentials (по умолчанию true для cookie-сессий) */
  withCredentials?: boolean;
  /** Колбэки статуса */
  onOpen?: () => void;
  onError?: (e: any) => void;
  /** Путь до SSE-стрима (по умолчанию /api/events/stream) */
  url?: string;
};

function safeParseJSON(raw: any) {
  if (raw == null) return null;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * useEventStream — лёгкий хук для подписки на SSE.
 *
 * Примеры:
 *   useEventStream({ ["notify:user:" + userId]: () => mutate() });
 *   useEventStream({ message: onAny }, { topic: "notify:user:" + userId });
 *   useEventStream({ "chapter:updated": onUpd, "thread:new_post": onNew });
 */
export function useEventStream(handlers: HandlerMap, opts: UseEventStreamOptions = {}) {
  // храним актуальные handlers/opts в ref, чтобы не рвать соединение без нужды
  const handlersRef = useRef<HandlerMap>(handlers);
  const optsRef = useRef<UseEventStreamOptions>(opts);
  handlersRef.current = handlers;
  optsRef.current = opts;

  // мемоизируем URL со всеми query
  const endpoint = useMemo(() => {
    const base = opts.url ?? "/api/events/stream";
    const url = new URL(base, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    if (opts.topic) url.searchParams.set("topic", opts.topic);
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
    // менять URL только при реальном изменении opts.url/topic/query
  }, [opts.url, opts.topic, JSON.stringify(opts.query)]);

  // следим за составом именованных событий — чтобы корректно навесить/снять листенеры
  const eventNames = useMemo(
    () => Object.keys(handlers).filter((n) => n !== "message"),
    [handlers]
  );

  useEffect(() => {
    // создаём EventSource
    const es = new EventSource(endpoint, {
      withCredentials: optsRef.current.withCredentials ?? true,
    });

    // дефолтные сообщения (event: message)
    es.onmessage = (ev) => {
      const data = safeParseJSON(ev.data);

      // если это ping/noop — игнор
      if (data && (data.type === "ping" || data.kind === "ping")) return;

      // если сервер шлёт {type: "..."} — пробросим в одноимённый хендлер
      const t = data?.type as string | undefined;
      if (t && handlersRef.current[t]) {
        try {
          handlersRef.current[t]?.(data);
          return;
        } catch (e) {
          // не прерываем — дадим шанс "message"
        }
      }

      // иначе — общий message
      handlersRef.current["message"]?.(data);
    };

    // именованные события
const attached: Array<{ name: string; fn: EventListener }> = [];
for (const name of eventNames) {
  const fn = (e: MessageEvent) => {
    const data = safeParseJSON(e.data);
    handlersRef.current[name]?.(data);
  };
  es.addEventListener(name, fn);
  attached.push({ name, fn });
}


    es.onopen = () => optsRef.current.onOpen?.();
    es.onerror = (e) => {
      optsRef.current.onError?.(e);
      // EventSource сам реконнектится; вручную не закрываем.
    };

    return () => {
      // снимаем именованные обработчики и закрываем стрим
      attached.forEach(({ name, fn }) => es.removeEventListener(name, fn));
      es.close();
    };
    // переподключение: при смене endpoint или набора именованных событий
  }, [endpoint, JSON.stringify(eventNames)]);
}
