"use client";

import { fetchJson } from "@/lib/apiClient";

type ChapterStatusAction = "open" | "close";

type ChapterStatusResponse = {
  ok?: boolean;
  error?: string;
};

export function toggleChapterStatus(input: {
  arcSlug: string;
  chapterId: string;
  action: ChapterStatusAction;
}) {
  return fetchJson<ChapterStatusResponse>(
    `/api/arcs/${encodeURIComponent(input.arcSlug)}/chapters/${encodeURIComponent(input.chapterId)}/${input.action}`,
    {
      method: "POST",
    }
  );
}
