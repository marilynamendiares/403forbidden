// src/components/ChapterLiveClient.tsx
"use client";
import { useRouter } from "next/navigation";
import { useEventStream } from "@/hooks/useEventStream";

export default function ChapterLiveClient(props: { slug: string; index: string | number }) {
  const router = useRouter();
  const slug = String(props.slug);
  const index = String(props.index);

  const log = (tag: string, e: any) => console.log(`[SSE:${tag}]`, e);

  useEventStream({
    "chapter:updated": (e) => {
      log("updated", e);
      if (String(e?.slug) === slug && String(e?.index) === index) router.refresh();
    },
    "chapter:published": (e) => {
      log("published", e);
      if (String(e?.slug) === slug && String(e?.index) === index) router.refresh();
    },
    "chapter:unpublished": (e) => {
      log("unpublished", e);
      if (String(e?.slug) === slug && String(e?.index) === index) router.refresh();
    },
    "chapter:deleted": (e) => {
      log("deleted", e);
      if (String(e?.slug) === slug && String(e?.index) === index) router.refresh();
    },
    "chapter:opened": (e) => {
      log("opened", e);
      if (String(e?.slug) === slug && String(e?.index) === index) router.refresh();
    },
    "chapter:closed": (e) => {
      log("closed", e);
      if (String(e?.slug) === slug && String(e?.index) === index) router.refresh();
    },
    // опционально: ловим hello
    message: (e) => log("message", e),
  });


  return null;
}
