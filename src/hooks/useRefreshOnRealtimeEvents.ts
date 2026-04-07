"use client";

import { useRouter } from "next/navigation";
import { useRealtime } from "@/hooks/useRealtime";

type MatchFn = (payload: unknown) => boolean;

export function useRefreshOnRealtimeEvents(
  eventNames: string[] | string,
  shouldRefresh?: MatchFn
) {
  const router = useRouter();

  useRealtime(eventNames, (payload) => {
    if (shouldRefresh && !shouldRefresh(payload)) return;
    router.refresh();
  });
}
