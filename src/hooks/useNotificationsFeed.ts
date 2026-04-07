// src/hooks/useNotificationsFeed.ts
"use client";

import { useEffect } from "react";
import useSWR from "swr";
import {
  notificationUnreadEventName,
  readNotificationUnreadDetail,
} from "@/lib/notificationUnreadEvents";
import {
  notificationsFeedPath,
  fetchNotificationsFeed,
  type NotificationsFeedResponse,
} from "@/lib/notificationsClient";

export type { NotificationItem } from "@/lib/notificationsClient";

export function useNotificationsFeed(limit = 5, enabled = true) {
  const key = enabled ? `${notificationsFeedPath}?limit=${limit}` : null;

  const { data, error, isLoading, mutate } = useSWR<NotificationsFeedResponse>(
    key,
    fetchNotificationsFeed,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,

      // 4 секунды — слишком агрессивно. Делаем “спокойно”.
      dedupingInterval: 30_000,

      // не перезапрашивать “просто потому что старое”
      revalidateIfStale: false,
      keepPreviousData: true,
    }
  );

  useEffect(() => {
    if (!enabled) return;

    const onLocal = (event: Event) => {
      const detail = readNotificationUnreadDetail(event);
      if (!detail) return;

      switch (detail.op) {
        case "set":
        case "inc":
        case "dec":
        case "clear":
          void mutate();
          break;
      }
    };

    window.addEventListener(notificationUnreadEventName, onLocal);
    return () => window.removeEventListener(notificationUnreadEventName, onLocal);
  }, [enabled, mutate]);

  return {
    items: data?.items ?? [],
    hasMore: Boolean(data?.nextCursor),
    loading: isLoading,
    error,
    refresh: () => mutate(),
  };
}
