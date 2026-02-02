"use client";

import useSWR from "swr";

type UnreadResp = { count: number };

const fetcher = (url: string) =>
  fetch(url, {
    cache: "no-store",
    credentials: "include",
  }).then((r) => {
    if (!r.ok) throw new Error("failed");
    return r.json();
  });

function isVisible() {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible";
}

export function useUnreadNotifications() {
  const { data, mutate, isLoading, error } = useSWR<UnreadResp>(
    // ВАЖНО: используем лёгкий endpoint, а не общий /api/notifications?unread=1
    "/api/notifications/unread-count",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,

      // жёстко режем “дёргание” в пределах коротких окон
      dedupingInterval: 60_000,

      // fallback-sync раз в 2 минуты, только когда вкладка видима
      refreshInterval: () => (isVisible() ? 120_000 : 0),
    }
  );

  const count = data?.count ?? 0;

  // локальная правка без похода в сеть:
  const setLocal = (next: number) => mutate({ count: Math.max(0, next) }, false);
  const incLocal = (delta = 1) => setLocal(count + delta);
  const decLocal = (delta = 1) => setLocal(count - delta);

  return {
    count,
    loading: isLoading,
    error,
    // реальный sync (по сети)
    sync: () => mutate(),
    // локальные операции (без сети)
    setLocal,
    incLocal,
    decLocal,
  };
}
