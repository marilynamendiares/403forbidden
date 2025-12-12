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

export function useNotificationsFeed(limit = 5) {
  const { data, error, isLoading, mutate } = useSWR<FeedResponse>(
    `/api/notifications?limit=${limit}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 4000,
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
