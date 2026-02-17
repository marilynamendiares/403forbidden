"use client";

import { useEffect, useMemo } from "react";

type Handler = (payload: any) => void;
type HandlersMap = Record<string, Handler>;

type Subscriber = {
  handlers: HandlersMap;
};

let ES: EventSource | null = null;
let SUBS: Subscriber[] = [];
let REFCOUNT = 0;

function ensureES(url: string) {
  if (ES) return;

  ES = new EventSource(url);

  ES.onmessage = (ev) => {
    // default event
    const payload = safeJson(ev.data);
    for (const sub of SUBS) sub.handlers["message"]?.(payload);
  };

  ES.addEventListener("hello", (ev) => {
    const payload = safeJson((ev as MessageEvent).data);
    for (const sub of SUBS) sub.handlers["hello"]?.(payload);
  });

  // generic dispatcher for named events
  // IMPORTANT: EventSource doesn't give us event name in onmessage,
  // so we attach listeners lazily per event name via addEventListener below.
}

function safeJson(s: any) {
  if (typeof s !== "string") return s;
  try {
    return JSON.parse(s);
  } catch {
    return { value: s };
  }
}

function attachNamedListeners(url: string, eventNames: string[]) {
  ensureES(url);
  if (!ES) return;

  for (const name of eventNames) {
    if (name === "message" || name === "hello") continue;

    ES.addEventListener(name, (ev) => {
      const payload = safeJson((ev as MessageEvent).data);
      for (const sub of SUBS) sub.handlers[name]?.(payload);
    });
  }
}

function maybeCloseES() {
  if (REFCOUNT > 0) return;
  if (ES) {
    try {
      ES.close();
    } catch {}
  }
  ES = null;
  SUBS = [];
}

/**
 * useEventStream — singleton EventSource for the whole tab.
 * Multiple calls won't create multiple network connections.
 */
export function useEventStream(handlers: HandlersMap) {
  const url = "/api/events/stream";

  const eventNames = useMemo(() => Object.keys(handlers), [handlers]);

  useEffect(() => {
    REFCOUNT += 1;

    // register subscriber
    const sub: Subscriber = { handlers };
    SUBS.push(sub);

    // attach listeners for currently needed event names
    attachNamedListeners(url, eventNames);

    return () => {
      // unregister subscriber
      SUBS = SUBS.filter((s) => s !== sub);

      REFCOUNT -= 1;
      if (REFCOUNT < 0) REFCOUNT = 0;

      // close connection when nobody needs it
      maybeCloseES();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, eventNames.join("|")]);
}
