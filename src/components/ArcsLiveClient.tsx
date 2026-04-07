"use client";

import { useRefreshOnRealtimeEvents } from "@/hooks/useRefreshOnRealtimeEvents";

export default function ArcsLiveClient() {
  useRefreshOnRealtimeEvents(
    ["arc:created", "arc:deleted", "arc:updated", "arc:published"],
  );

  return null;
}
