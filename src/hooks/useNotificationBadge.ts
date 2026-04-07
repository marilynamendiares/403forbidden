"use client";

import { useEffect } from "react";
import { useEventStream } from "@/features/realtime/client/useEventStream";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { readNotificationEventType } from "@/lib/notificationRealtime";
import {
  notificationUnreadEventName,
  readNotificationUnreadDetail,
} from "@/lib/notificationUnreadEvents";

type Options = {
  sseEventName?: string;
  enabled?: boolean;
  syncOnMount?: boolean;
  syncOnVisible?: boolean;
};

export function useNotificationBadge({
  sseEventName,
  enabled = true,
  syncOnMount = false,
  syncOnVisible = false,
}: Options) {
  const { count, setLocal, incLocal, decLocal, sync } = useUnreadNotifications();

  useEffect(() => {
    if (!enabled || !syncOnMount) return;
    void sync();
  }, [enabled, sync, syncOnMount]);

  useEventStream(
    enabled && sseEventName
      ? {
          [sseEventName]: (payload: unknown) => {
            const eventType = readNotificationEventType(payload);
            if (eventType && (eventType.startsWith("notification:") || eventType.startsWith("notify:"))) {
              incLocal(1);
              return;
            }
            if (eventType === "notifications:read_all") {
              setLocal(0);
              return;
            }
            if (eventType === "notification:read_one" || eventType === "notification:mark_read") {
              decLocal(1);
            }
          },
        }
      : {}
  );

  useEffect(() => {
    if (!enabled) return;

    const onLocal = (event: Event) => {
      const detail = readNotificationUnreadDetail(event);
      if (!detail) return;

      switch (detail.op) {
        case "set":
          setLocal(Number(detail.count ?? 0));
          break;
        case "inc":
          incLocal(Number(detail.delta ?? 1));
          break;
        case "dec":
          decLocal(Number(detail.delta ?? 1));
          break;
        case "clear":
          setLocal(0);
          break;
      }
    };

    window.addEventListener(notificationUnreadEventName, onLocal);
    return () => window.removeEventListener(notificationUnreadEventName, onLocal);
  }, [decLocal, enabled, incLocal, setLocal]);

  useEffect(() => {
    if (!enabled || !syncOnVisible) return;

    let lastSyncAt = 0;
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastSyncAt < 30_000) return;
      lastSyncAt = now;
      void sync();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [enabled, sync, syncOnVisible]);

  return { count };
}
