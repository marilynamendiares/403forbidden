// src/components/ChapterLiveClient.tsx
"use client";
import { useRouter } from "next/navigation";
import { useEventStream } from "@/features/realtime/client/useEventStream";

type ChapterEventPayload = {
  slug?: string;
  index?: string | number;
};

export default function ChapterLiveClient(props: { slug: string; index: string | number }) {
  const router = useRouter();
  const slug = String(props.slug);
  const index = String(props.index);

  const toChapterEventPayload = (value: unknown): ChapterEventPayload => {
    if (!value || typeof value !== "object") return {};
    return value as ChapterEventPayload;
  };

  useEventStream({
    "chapter:updated": (e) => {
      const payload = toChapterEventPayload(e);
      if (String(payload.slug) === slug && String(payload.index) === index) router.refresh();
    },
    "chapter:published": (e) => {
      const payload = toChapterEventPayload(e);
      if (String(payload.slug) === slug && String(payload.index) === index) router.refresh();
    },
    "chapter:unpublished": (e) => {
      const payload = toChapterEventPayload(e);
      if (String(payload.slug) === slug && String(payload.index) === index) router.refresh();
    },
    "chapter:deleted": (e) => {
      const payload = toChapterEventPayload(e);
      if (String(payload.slug) === slug && String(payload.index) === index) router.refresh();
    },
    "chapter:opened": (e) => {
      const payload = toChapterEventPayload(e);
      if (String(payload.slug) === slug && String(payload.index) === index) router.refresh();
    },
    "chapter:closed": (e) => {
      const payload = toChapterEventPayload(e);
      if (String(payload.slug) === slug && String(payload.index) === index) router.refresh();
    },
  });

  return null;
}
