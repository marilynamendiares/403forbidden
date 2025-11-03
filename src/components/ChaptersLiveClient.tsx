// src/components/ChaptersLiveClient.tsx
"use client";
import { useRouter } from "next/navigation";
import { useEventStream } from "@/hooks/useEventStream";

export default function ChaptersLiveClient({ slug }: { slug: string }) {
  const router = useRouter();
  const match = (e: any) => String(e?.slug) === String(slug);

  useEventStream({
    "chapter:created":     (e) => { if (match(e)) router.refresh(); },
    "chapter:deleted":     (e) => { if (match(e)) router.refresh(); },
    "chapter:published":   (e) => { if (match(e)) router.refresh(); },
    "chapter:unpublished": (e) => { if (match(e)) router.refresh(); },
    // на будущее, если решишь эмитить единый сигнал
    "chapter:list_changed": (e) => { if (match(e)) router.refresh(); },
  });

  return null;
}
