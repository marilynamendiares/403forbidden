"use client";

import { useEffect, useMemo } from "react";

export type Handler = (payload: any) => void;
export type HandlerMap = Record<string, Handler>;

export type EventStreamOptions = {
  /** базовый URL (по умолчанию /api/events/stream) */
  url?: string;
  /** если когда-то захочешь прокидывать topic */
  topic?: string;
  /** query-параметры */
  query?: Record<string, string | number | boolean | undefined>;
  /** нативный EventSource не поддерживает credentials; оставляем для совместимости */
  withCredentials?: boolean;
  onOpen?: () => void;
  onError?: (e: any) => void;
};

type Subscriber = { handlers: HandlerMap };

// --- HMR/StrictMode-safe singleton state (живёт на globalThis) ---
type ESState = {
  es: EventSource | null;
  url: string | null;
  subs: Subscriber[];
  refcount: number;
  // чтобы не навешивать addEventListener(name) много раз
  attachedNames: Set<string>;
  // чтобы понимать, что мы уже проставили базовые хендлеры
  inited: boolean;
};

const GKEY = "__403_ES_STATE__";

function getState(): ESState {
  const g = globalThis as any;
  if (!g[GKEY]) {
    g[GKEY] = {
      es: null,
      url: null,
      subs: [],
      refcount: 0,
      attachedNames: new Set<string>(),
      inited: false,
    } satisfies ESState;
  }
  return g[GKEY] as ESState;
}

function safeJson(s: any) {
  if (typeof s !== "string") return s;
  try {
    return JSON.parse(s);
  } catch {
    return { value: s };
  }
}

function buildUrl(opts?: EventStreamOptions) {
  const base = opts?.url ?? "/api/events/stream";
  const u = new URL(base, window.location.origin);

  if (opts?.topic) u.searchParams.set("topic", opts.topic);

  if (opts?.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === undefined) continue;
      u.searchParams.set(k, String(v));
    }
  }

  return u.pathname + (u.search ? u.search : "");
}

function ensureES(url: string, opts?: EventStreamOptions) {
  const st = getState();

  // если URL изменился — закрываем старый ES и сбрасываем listeners
  if (st.es && st.url && st.url !== url) {
    try {
      st.es.close();
    } catch {}
    st.es = null;
    st.url = null;
    st.attachedNames.clear();
    st.inited = false;
  }

  if (st.es) return;

  st.es = new EventSource(url);
  st.url = url;

  // базовые события
  if (!st.inited && st.es) {
    st.inited = true;

    st.es.onopen = () => {
      opts?.onOpen?.();
    };

    st.es.onerror = (e) => {
      opts?.onError?.(e);
    };

    st.es.onmessage = (ev) => {
      const payload = safeJson(ev.data);
      for (const sub of st.subs) sub.handlers["message"]?.(payload);
    };

    st.es.addEventListener("hello", (ev) => {
      const payload = safeJson((ev as MessageEvent).data);
      for (const sub of st.subs) sub.handlers["hello"]?.(payload);
    });
  }
}

function attachNamedListeners(url: string, eventNames: string[]) {
  const st = getState();
  ensureES(url);

  if (!st.es) return;

  for (const name of eventNames) {
    if (name === "message" || name === "hello") continue;

    // важно: не добавлять один и тот же listener много раз
    if (st.attachedNames.has(name)) continue;
    st.attachedNames.add(name);

    st.es.addEventListener(name, (ev) => {
      const payload = safeJson((ev as MessageEvent).data);
      for (const sub of st.subs) sub.handlers[name]?.(payload);
    });
  }
}

function maybeCloseES() {
  const st = getState();
  if (st.refcount > 0) return;

  if (st.es) {
    try {
      st.es.close();
    } catch {}
  }

  st.es = null;
  st.url = null;
  st.subs = [];
  st.attachedNames.clear();
  st.inited = false;
}

/**
 * useEventStream — singleton EventSource for the whole tab.
 * Multiple calls won't create multiple network connections.
 */
export function useEventStream(handlers: HandlerMap, opts?: EventStreamOptions) {
  const url = useMemo(() => buildUrl(opts), [opts?.url, opts?.topic, JSON.stringify(opts?.query ?? {})]);

  const eventNames = useMemo(() => Object.keys(handlers), [handlers]);

  useEffect(() => {
    const st = getState();
    st.refcount += 1;

    const sub: Subscriber = { handlers };
    st.subs.push(sub);

    attachNamedListeners(url, eventNames);

    return () => {
      const st2 = getState();
      st2.subs = st2.subs.filter((s) => s !== sub);

      st2.refcount -= 1;
      if (st2.refcount < 0) st2.refcount = 0;

      maybeCloseES();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, eventNames.join("|")]);
}
