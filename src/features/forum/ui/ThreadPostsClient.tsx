"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Markdown from "@/components/Markdown";
import UserBadge from "@/components/UserBadge";
import { timeAgo } from "@/lib/TimeAgo";
import { useEventStream } from "@/features/realtime/client/useEventStream";

type Post = {
  id: string;
  createdAt: string;
  updatedAt: string;
  markdown: string;
  authorId: string;
  author: {
    id: string;
    username: string;
    profile: { displayName: string | null; avatarUrl: string | null } | null;
  } | null;
};

type Props = {
  category: string;
  slug: string;
  initialPosts: Post[];
  initialNextCursor: string | null;
  meId: string | null;
  removePostAction: (id: string) => Promise<void>;
};

export default function ThreadPostsClient({
  category,
  slug,
  initialPosts,
  initialNextCursor,
  meId,
  removePostAction,
}: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [nextCursor] = useState<string | null>(initialNextCursor);

  const inflightRef = useRef(false);
  const queuedRef = useRef(false);

  const lastId = useMemo(() => posts.at(-1)?.id ?? null, [posts]);

  const matchThread = useCallback(
    (e: any) => String(e?.category) === String(category) && String(e?.slug) === String(slug),
    [category, slug]
  );

  const fetchNew = useCallback(async () => {
    if (inflightRef.current) {
      queuedRef.current = true;
      return;
    }
    inflightRef.current = true;

    try {
      const base = `/api/forum/categories/${encodeURIComponent(category)}/threads/${encodeURIComponent(slug)}/posts`;
      const url = new URL(base, window.location.origin);

      if (lastId) url.searchParams.set("cursor", lastId);
      url.searchParams.set("take", "100");

      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) return;

      const data = await res.json().catch(() => null);
      const items: Post[] = Array.isArray(data?.items) ? data.items : [];

      if (items.length) {
        setPosts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const merged = [...prev];
          for (const it of items) {
            if (!seen.has(it.id)) merged.push(it);
          }
          return merged;
        });
      }
    } finally {
      inflightRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        fetchNew();
      }
    }
  }, [category, slug, lastId]);

  useEventStream({
    "thread:new_post": (e) => {
      if (!matchThread(e)) return;

      // оптимизация: если это событие уже содержит postId — можно попробовать "быстрый dedupe",
      // но мы всё равно подкачиваем через cursor (самый надёжный источник истины)
      fetchNew();
    },
    "thread:post_deleted": (e) => {
      if (!matchThread(e)) return;
      const postId = e?.postId;
      if (!postId) return;
      setPosts((prev) => prev.filter((p) => p.id !== String(postId)));
    },
  });

  return (
    <>
      <ul className="grid gap-3">
        {posts.map((p) => (
          <li key={p.id} className="border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <UserBadge
                href={`/u/${encodeURIComponent(p.author?.username ?? "user")}`}
                avatar={p.author?.profile?.avatarUrl ?? null}
                username={p.author?.username ?? "user"}
                displayName={p.author?.profile?.displayName ?? null}
                size={24}
              />
              <time className="text-xs opacity-60">{timeAgo(p.createdAt)}</time>
            </div>

            <Markdown>{p.markdown ?? ""}</Markdown>

            {meId && meId === p.authorId && (
              <form action={removePostAction.bind(null, p.id)} className="pt-2">
                <button type="submit" className="text-xs opacity-70 hover:opacity-100 underline">
                  Delete
                </button>
              </form>
            )}
          </li>
        ))}
        {posts.length === 0 && <p className="opacity-60">No posts yet.</p>}
      </ul>

      {nextCursor && (
        <div className="pt-2">
          <Link
            href={`/forum/${category}/${slug}?cursor=${nextCursor}`}
            className="rounded bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
          >
            Load more posts
          </Link>
        </div>
      )}
    </>
  );
}
