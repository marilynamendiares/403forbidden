// src/components/chapter/ChapterPostList.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChapterPostItem } from "./ChapterPostItem";
import { useEventStream } from "@/features/realtime/client/useEventStream";
import {
  fetchChapterPostPage,
  type ChapterPostListItem,
} from "@/lib/chapterPostsClient";

type Item = ChapterPostListItem;

type NewPostEvent = {
  slug: string;
  index: number | string;
  post: Item;
};

type UpdatedPostEvent = {
  slug: string;
  index: number | string;
  postId: string;
  contentMd?: string;
  editedAt?: string | null;
};

type DeletedPostEvent = {
  slug: string;
  index: number | string;
  postId: string;
};

type Props = {
  slug: string;
  index: number | string;
  currentUserId?: string | null;
  initialItems?: Item[];
  initialNextCursor?: string | null;
  optimisticPost?: Item | null;
};

export function ChapterPostList({
  slug,
  index,
  currentUserId,
  initialItems = [],
  initialNextCursor = null,
  optimisticPost = null,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<Item[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(initialNextCursor === null);

  const baseUrl = useMemo(() => `/api/arcs/${slug}/${index}/posts`, [slug, index]);

  const dedupe = useCallback((arr: Item[]) => {
    const seen = new Set<string>();
    const out: Item[] = [];
    for (const it of arr) {
      if (!seen.has(it.id)) {
        seen.add(it.id);
        out.push(it);
      }
    }
    return out;
  }, []);

  const fetchPage = useCallback(async () => {
    if (loading || reachedEnd) return;
    setLoading(true);
    const url = cursor ? `${baseUrl}?cursor=${encodeURIComponent(cursor)}` : baseUrl;
    try {
      const json = await fetchChapterPostPage(url);
      if (!json) return;
      setItems((prev) => dedupe([...prev, ...json.items]));
      if (json.nextCursor) {
        setCursor(json.nextCursor);
      } else {
        setReachedEnd(true);
      }
    } finally {
      setLoading(false);
    }
  }, [baseUrl, cursor, loading, reachedEnd, dedupe]);

  // reset при смене главы
  useEffect(() => {
    setItems(initialItems);
    setCursor(initialNextCursor);
    setReachedEnd(initialNextCursor === null);
  }, [slug, index, initialItems, initialNextCursor]);

  useEffect(() => {
    if (!optimisticPost) return;
    setItems((prev) => dedupe([...prev, optimisticPost]));
  }, [dedupe, optimisticPost]);

  // локальные апдейты после edit/delete (из дочернего элемента)
  function handleAfterChange(
    kind: "updated" | "deleted",
    id: string,
    next?: Partial<Item>
  ) {
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      const copy = prev.slice();
      if (kind === "deleted") {
        copy.splice(idx, 1);
      } else {
        copy[idx] = { ...copy[idx], ...(next as Item) };
      }
      return copy;
    });
  }

  // 🔴 LIVE: SSE-подписки
  useEventStream({
    "chapter:new_post": (e) => {
      const payload = e as NewPostEvent | null;
      // ожидаем payload вида: { slug, index, post: { id, contentMd, createdAt, author{...} } }
      if (!payload || payload.slug !== slug || String(payload.index) !== String(index) || !payload.post) return;

      const el = rootRef.current;
      const shouldStick =
        !!el && el.scrollHeight - el.scrollTop - el.clientHeight < 200;

      const it: Item = {
        id: payload.post.id,
        contentMd: payload.post.contentMd,
        createdAt: payload.post.createdAt,
        editedAt: null,
        author: payload.post.author,
        character: payload.post.character ?? null,
      };

      setItems((prev) => {
        if (prev.some((p) => p.id === it.id)) return prev;
        return [...prev, it];
      });

      if (shouldStick && el) {
        setTimeout(() => {
          if (!rootRef.current) return;
          rootRef.current.scrollTop = rootRef.current.scrollHeight;
        }, 0);
      }
    },

    "chapter:post_updated": (e) => {
      const payload = e as UpdatedPostEvent | null;
      if (!payload || payload.slug !== slug || String(payload.index) !== String(index) || !payload.postId) return;
      setItems((prev) => {
        const i = prev.findIndex((p) => p.id === payload.postId);
        if (i === -1) return prev;
        const cp = prev.slice();
        cp[i] = {
          ...cp[i],
          ...(typeof payload.contentMd === "string" ? { contentMd: payload.contentMd } : {}),
          editedAt: payload.editedAt ?? new Date().toISOString(),
        };
        return cp;
      });
    },

    "chapter:post_deleted": (e) => {
      const payload = e as DeletedPostEvent | null;
      // payload: { slug, index, postId }
      if (!payload || payload.slug !== slug || String(payload.index) !== String(index) || !payload.postId) return;
      setItems((prev) => prev.filter((p) => p.id !== payload.postId));
    },
  });

return (
  <div ref={rootRef} className="space-y-4">

{items.map((it) => (
  <div
    key={it.id}
    id={`post-${it.id}`} // ← якорь, чтобы работали ссылки ...#post-<id>
  >
    <ChapterPostItem
      post={it}
      author={it.author}
      character={it.character}
      currentUserId={currentUserId ?? null}
      slug={slug}
      index={index}
      onAfterChange={handleAfterChange}
    />
  </div>
))}


    {loading && (
      <div className="py-4 text-center text-muted-foreground">Loading…</div>
    )}

    {/* Load more */}
    {!loading && !reachedEnd && (
      <div className="py-4 text-center">
        <button
          type="button"
          onClick={() => void fetchPage()}
          className="text-sm underline hover:no-underline"
        >
          Load more
        </button>
      </div>
    )}

{/* ────────────────────────────────────────────────
    END / NEXT CHAPTER BUTTON
   ──────────────────────────────────────────────── */}
  </div>
);

}
