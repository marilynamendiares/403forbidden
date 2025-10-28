// src/components/ThreadLiveClient.tsx
"use client";
import { useRouter } from "next/navigation";
import { useEventStream } from "@/hooks/useEventStream";

type Props =
  | { threadId: string; category?: never; slug?: never }
  | { threadId?: never; category: string; slug: string };

export default function ThreadLiveClient(props: Props) {
  const router = useRouter();
  const match = (e: any) => {
    if ("threadId" in props && props.threadId) {
      return String(e?.threadId) === String(props.threadId);
    }
    return String(e?.category) === String((props as any).category)
      && String(e?.slug) === String((props as any).slug);
  };

  useEventStream({
    "thread:new_post": (e) => { if (match(e)) router.refresh(); },
    "thread:post_deleted": (e) => { if (match(e)) router.refresh(); },
  });

  return null;
}
