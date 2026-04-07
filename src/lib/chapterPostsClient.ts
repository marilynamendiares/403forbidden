"use client";

import { fetchJson } from "@/lib/apiClient";

type Author = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
};

export type ChapterPostListItem = {
  id: string;
  contentMd: string;
  createdAt: string;
  editedAt?: string | null;
  author: Author;
};

export type ChapterPostPageResponse = {
  items: ChapterPostListItem[];
  nextCursor?: string | null;
};

export async function fetchChapterPostPage(url: string) {
  return fetchJson<ChapterPostPageResponse>(url, {
    includeCredentials: true,
  }).catch(() => null);
}

export async function createChapterPost(input: {
  slug: string;
  index: number | string;
  contentMd: string;
}) {
  const json = await fetchJson<{ ok?: boolean; post?: ChapterPostListItem }>(
    `/api/arcs/${input.slug}/${input.index}/posts`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      includeCredentials: true,
      body: JSON.stringify({ contentMd: input.contentMd }),
    }
  );

  return json?.post ?? null;
}
