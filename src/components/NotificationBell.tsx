"use client";

import { useEffect } from "react";
import { useEventStream } from "@/features/realtime/client/useEventStream";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

export default function NotificationBell(props: { sseEventName?: string; className?: string }) {
  const { count, incLocal, decLocal, setLocal, sync } = useUnreadNotifications();

  // SSE: обновляем локально (без сети) + изредка можно делать sync при reconnect/event если хочешь
  useEventStream(
    props.sseEventName
      ? {
          [props.sseEventName]: (msg: any) => {
            const t: string | undefined = msg?.type || msg?.event || msg?.topic || msg?.name;
            if (typeof t === "string" && (t.startsWith("notification:") || t.startsWith("notify:"))) {
              incLocal(1);
            }
            if (t === "notifications:read_all") setLocal(0);
            if (t === "notification:read_one" || t === "notification:mark_read") decLocal(1);
          },
        }
      : {}
  );

  // Если вкладка вернулась после долгого сна — один sync (без постоянного focus-spam)
  useEffect(() => {
    let last = 0;
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last < 30_000) return; // cooldown 30s
      last = now;
      sync();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [sync]);

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
