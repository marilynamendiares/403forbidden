// src/hooks/useNotificationsFeed.ts
"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url, {
  cache: "no-store",
  credentials: "include",
}).then((r) => r.json());

export type NotificationItem = {
  id: string;
  type: string;
  isRead: boolean;
  createdAt: string;        // ISO string
  payload: any;

  // enriched fields (mapped on backend)
  title: string;
  subtitle: string;
  href: string | null;
};

type FeedResponse = {
  items: NotificationItem[];
  nextCursor: string | null;
};

export function useNotificationsFeed(limit = 5, enabled = true) {
  const key = enabled ? `/api/notifications?limit=${limit}` : null;

  const { data, error, isLoading, mutate } = useSWR<FeedResponse>(
    key,
    fetcher,
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

  return {
    items: data?.items ?? [],
    hasMore: Boolean(data?.nextCursor),
    loading: isLoading,
    error,
    refresh: () => mutate(),
  };
}
