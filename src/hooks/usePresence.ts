"use client";

import { useEffect, useMemo, useState } from "react";
import { pingPresence, type PresenceResponse } from "@/lib/presenceClient";

const PRESENCE_INTERVAL_MS = 5 * 60 * 1000;

export function usePresence(enabled = true) {
  const [data, setData] = useState<PresenceResponse | null>(null);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      return;
    }

    const isVisible = () => document.visibilityState === "visible";

    const refreshVisiblePresence = async () => {
      if (!isVisible()) {
        return;
      }

      const payload = await pingPresence().catch(() => null);
      if (!payload) return;
      setData(payload);
    };

    void refreshVisiblePresence();

    const intervalId = window.setInterval(() => {
      void refreshVisiblePresence();
    }, PRESENCE_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (!isVisible()) {
        return;
      }

      void refreshVisiblePresence();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled]);

  const onlineIds = useMemo(
    () => new Set(data?.onlineUserIds ?? []),
    [data?.onlineUserIds]
  );

  return { onlineIds };
}
