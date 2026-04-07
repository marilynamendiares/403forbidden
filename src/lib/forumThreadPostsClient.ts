"use client";

import { fetchJson } from "@/lib/apiClient";
import type { ThreadPost } from "@/features/forum/ui/useThreadRealtimePosts";

export type ForumThreadPostsResponse = {
  items?: ThreadPost[];
  nextCursor?: string | null;
};

function buildForumThreadPostsUrl(input: {
  category: string;
  slug: string;
  cursor?: string | null;
  afterCreatedAt?: string | null;
  afterId?: string | null;
  take?: number;
}) {
  const base = `/api/forum/categories/${encodeURIComponent(input.category)}/threads/${encodeURIComponent(input.slug)}/posts`;
  const searchParams = new URLSearchParams();

  if (input.cursor) searchParams.set("cursor", input.cursor);
  if (input.afterCreatedAt) searchParams.set("afterCreatedAt", input.afterCreatedAt);
  if (input.afterId) searchParams.set("afterId", input.afterId);
  searchParams.set("take", String(input.take ?? 100));

  return `${base}?${searchParams.toString()}`;
}

export async function fetchNewForumThreadPosts(input: {
  category: string;
  slug: string;
  afterCreatedAt?: string | null;
  afterId?: string | null;
  take?: number;
}) {
  return fetchJson<ForumThreadPostsResponse>(
    buildForumThreadPostsUrl(input)
  );
}

export async function fetchForumThreadPostsPage(input: {
  category: string;
  slug: string;
  cursor?: string | null;
  take?: number;
}) {
  return fetchJson<ForumThreadPostsResponse>(
    buildForumThreadPostsUrl(input)
  );
}
