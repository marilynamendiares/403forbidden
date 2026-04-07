"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useEventStream } from "@/features/realtime/client/useEventStream";
import { fetchNewForumThreadPosts } from "@/lib/forumThreadPostsClient";

export type ThreadPost = {
  id: string;
  createdAt: string;
  updatedAt: string;
  markdown: string;
  likesCount: number;
  likedByMe: boolean;
  repCount: number;
  repGivenByMe: boolean;
  reportedByMe: boolean;
  hiddenAt?: string | null;
  hiddenById?: string | null;
  deletedAt?: string | null;
  deletedById?: string | null;
  authorId: string;
  author: {
    id: string;
    username: string | null;
    profile: { displayName: string | null; avatarUrl: string | null } | null;
  } | null;
};

type ThreadRealtimeEvent = {
  category?: string;
  slug?: string;
  postId?: string;
  post?: ThreadPost;
  hiddenAt?: string | null;
  hiddenById?: string | null;
  deletedAt?: string | null;
  deletedById?: string | null;
};

function toThreadRealtimeEvent(payload: unknown): ThreadRealtimeEvent {
  if (!payload || typeof payload !== "object") return {};
  return payload as ThreadRealtimeEvent;
}

function mergeNewPosts(currentPosts: ThreadPost[], incomingPosts: ThreadPost[]) {
  const seen = new Set(currentPosts.map((post) => post.id));
  const merged = [...currentPosts];
  let added = 0;

  for (const post of incomingPosts) {
    if (!seen.has(post.id)) {
      merged.push(post);
      added += 1;
    }
  }

  return added > 0 ? merged : currentPosts;
}

type Options = {
  category: string;
  slug: string;
  initialPosts: ThreadPost[];
};

export function useThreadRealtimePosts({ category, slug, initialPosts }: Options) {
  const [posts, setPosts] = useState<ThreadPost[]>(initialPosts);
  const inflightRef = useRef(false);
  const queuedRef = useRef(false);
  const postsRef = useRef<ThreadPost[]>(initialPosts);

  const setPostsAndTrack = useCallback(
    (next: ThreadPost[] | ((current: ThreadPost[]) => ThreadPost[])) => {
      setPosts((current) => {
        const resolved = typeof next === "function" ? next(current) : next;
        postsRef.current = resolved;
        return resolved;
      });
    },
    []
  );

  const lastPost = useMemo(() => posts.at(-1) ?? null, [posts]);
  const lastId = lastPost?.id ?? null;
  const lastCreatedAt = lastPost?.createdAt ?? null;

  const matchThread = useCallback(
    (event: ThreadRealtimeEvent | null | undefined) =>
      String(event?.category) === String(category) && String(event?.slug) === String(slug),
    [category, slug]
  );

  const fetchNew = useCallback(async () => {
    if (inflightRef.current) {
      queuedRef.current = true;
      return;
    }
    inflightRef.current = true;

    try {
      const data = await fetchNewForumThreadPosts({
        category,
        slug,
        afterCreatedAt: lastCreatedAt,
        afterId: lastId,
        take: 100,
      });
      const items: ThreadPost[] = Array.isArray(data?.items) ? data.items : [];

      if (items.length) {
        setPosts((prev) => mergeNewPosts(prev, items));
      }
    } finally {
      inflightRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        void fetchNew();
      }
    }
  }, [category, slug, lastCreatedAt, lastId]);

  useEventStream({
    "thread:new_post": (payload) => {
      const event = toThreadRealtimeEvent(payload);
      if (!matchThread(event)) return;
      if (event.post && !postsRef.current.some((post) => post.id === event.post?.id)) {
        setPostsAndTrack((prev) => mergeNewPosts(prev, [event.post as ThreadPost]));
        return;
      }
      if (event.postId && postsRef.current.some((post) => post.id === event.postId)) {
        return;
      }
      void fetchNew();
    },
    "thread:post_deleted": (payload) => {
      const event = toThreadRealtimeEvent(payload);
      if (!matchThread(event)) return;
      const postId = event?.postId;
      if (!postId) return;
      setPostsAndTrack((prev) =>
        prev.map((post) =>
          post.id === String(postId)
            ? {
                ...post,
                markdown: "",
                deletedAt: event.deletedAt ?? new Date().toISOString(),
                deletedById: event.deletedById ?? null,
              }
            : post
        )
      );
    },
    "thread:post_hidden": (payload) => {
      const event = toThreadRealtimeEvent(payload);
      if (!matchThread(event)) return;
      const postId = event?.postId;
      if (!postId) return;
      setPostsAndTrack((prev) =>
        prev.map((post) =>
          post.id === String(postId)
            ? {
                ...post,
                markdown: "",
                hiddenAt: event.hiddenAt ?? new Date().toISOString(),
                hiddenById: event.hiddenById ?? null,
              }
            : post
        )
      );
    },
    "thread:post_unhidden": (payload) => {
      const event = toThreadRealtimeEvent(payload);
      if (!matchThread(event)) return;
      void fetchNew();
    },
  });

  const appendPosts = useCallback((incomingPosts: ThreadPost[]) => {
    if (!incomingPosts.length) return;
    setPostsAndTrack((prev) => mergeNewPosts(prev, incomingPosts));
  }, [setPostsAndTrack]);

  const patchPost = useCallback(
    (postId: string, apply: (post: ThreadPost) => ThreadPost) => {
      setPostsAndTrack((prev) =>
        prev.map((post) => (post.id === postId ? apply(post) : post))
      );
    },
    [setPostsAndTrack]
  );

  return { posts, appendPosts, patchPost };
}
