"use client";

import useSWR from "swr";
import { useEventStream } from "@/hooks/useEventStream"; // ← твой хук
import { useEffect } from "react";

const fetcher = (u: string) => fetch(u).then(r => r.json());

export default function NotificationBell(props: { sseEventName?: string; className?: string }) {
  const { data, mutate } = useSWR<{ count: number }>("/api/notifications/count", fetcher, {
    refreshInterval: 20000,
  });

  // SSE: как только придёт событие notify:user:<id> — обновляем счётчик
  useEventStream(
    props.sseEventName
      ? { [props.sseEventName]: () => mutate() }
      : { message: () => mutate() } // fallback, если вдруг шлёшь в default 'message'
  );

  // На фокус вкладки тоже обновим
  useEffect(() => {
    const h = () => mutate();
    window.addEventListener("focus", h);
    return () => window.removeEventListener("focus", h);
  }, [mutate]);

  const count = data?.count ?? 0;

  return (
    <button
      className={`relative inline-flex items-center justify-center rounded-xl px-3 py-2 hover:opacity-90 ${props.className ?? ""}`}
      onClick={() => (window.location.href = "/notifications")}
      aria-label="Notifications"
    >
      <span>🔔</span>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-5 rounded-full px-1.5 py-0.5 text-xs font-bold bg-red-600 text-white text-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
