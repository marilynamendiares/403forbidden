// src/components/ChaptersLiveClient.tsx
"use client";
import { useRefreshOnRealtimeEvents } from "@/hooks/useRefreshOnRealtimeEvents";

type ChapterListEventPayload = {
  slug?: string;
};

export default function ChaptersLiveClient({ slug }: { slug: string }) {
  const match = (payload: unknown) => {
    const e = (payload && typeof payload === "object" ? payload : {}) as ChapterListEventPayload;
    return String(e?.slug) === String(slug);
  };

  useRefreshOnRealtimeEvents(
    [
      "chapter:created",
      "chapter:deleted",
      "chapter:published",
      "chapter:unpublished",
      "chapter:list_changed",
    ],
    match
  );

  return null;
}
