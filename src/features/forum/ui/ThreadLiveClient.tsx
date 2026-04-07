// src/components/ThreadLiveClient.tsx
"use client";
import { useRefreshOnRealtimeEvents } from "@/hooks/useRefreshOnRealtimeEvents";

type Props =
  | { threadId: string; category?: never; slug?: never }
  | { threadId?: never; category: string; slug: string };

type ThreadEventPayload = {
  threadId?: string;
  category?: string;
  slug?: string;
};

export default function ThreadLiveClient(props: Props) {
  const match = (payload: unknown) => {
    const e = (payload && typeof payload === "object" ? payload : {}) as ThreadEventPayload;
    if ("threadId" in props && props.threadId) {
      return String(e?.threadId) === String(props.threadId);
    }
    return String(e?.category) === String(props.category) && String(e?.slug) === String(props.slug);
  };

  useRefreshOnRealtimeEvents(["thread:new_post", "thread:post_deleted"], match);

  return null;
}
