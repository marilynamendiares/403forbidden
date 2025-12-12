// src/components/chapter/ChapterPostList.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChapterPostItem } from "./ChapterPostItem";
import { useEventStream } from "@/hooks/useEventStream";

type Author = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

type Item = {
  id: string;
  contentMd: string;
  createdAt: string;
  editedAt?: string | null;
  author: Author;
};

type Props = {
  slug: string;
  index: number | string;
  currentUserId?: string | null;
  /** null / undefined → показываем END; число → ссылка на следующую главу */
  nextChapterIndex?: number | null;
};

export function ChapterPostList({
  slug,
  index,
  currentUserId,
  nextChapterIndex,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);

  const baseUrl = useMemo(() => `/api/books/${slug}/${index}/posts`, [slug, index]);

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
    const res = await fetch(url, { cache: "no-store", credentials: "include" });
    setLoading(false);
    if (!res.ok) return;
    const json = (await res.json().catch(() => null)) as
      | { items: Item[]; nextCursor?: string | null }
      | null;
    if (!json) return;
    setItems((prev) => dedupe([...prev, ...json.items]));
    if (json.nextCursor) {
      setCursor(json.nextCursor);
    } else {
      setReachedEnd(true);
    }
  }, [baseUrl, cursor, loading, reachedEnd, dedupe]);

  // reset при смене главы
  useEffect(() => {
    setItems([]);
    setCursor(null);
    setReachedEnd(false);
  }, [slug, index]);

  // первая загрузка
  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

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
    "chapter:new_post": (e: any) => {
      // ожидаем payload вида: { slug, index, post: { id, contentMd, createdAt, author{...} } }
      if (!e || e.slug !== slug || String(e.index) !== String(index) || !e.post) return;

      const el = rootRef.current;
      const shouldStick =
        !!el && el.scrollHeight - el.scrollTop - el.clientHeight < 200;

      const it: Item = {
        id: e.post.id,
        contentMd: e.post.contentMd,
        createdAt: e.post.createdAt,
        editedAt: null,
        author: e.post.author,
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

    "chapter:post_updated": (e: any) => {
      if (!e || e.slug !== slug || String(e.index) !== String(index) || !e.postId) return;
      setItems((prev) => {
        const i = prev.findIndex((p) => p.id === e.postId);
        if (i === -1) return prev;
        const cp = prev.slice();
        cp[i] = {
          ...cp[i],
          ...(typeof e.contentMd === "string" ? { contentMd: e.contentMd } : {}),
          editedAt: e.editedAt ?? new Date().toISOString(),
        };
        return cp;
      });
    },

    "chapter:post_deleted": (e: any) => {
      // payload: { slug, index, postId }
      if (!e || e.slug !== slug || String(e.index) !== String(index) || !e.postId) return;
      setItems((prev) => prev.filter((p) => p.id !== e.postId));
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
{!loading && reachedEnd && (
  <div className="pt-6 flex justify-end">
    {nextChapterIndex ? (
      <a
        href={`/books/${slug}/${nextChapterIndex}`}
        className="inline-flex items-center gap-2 rounded-md border border-white/30 
                   px-4 py-2 text-sm text-white hover:bg-white hover:text-black 
                   transition"
      >
        Next chapter →
      </a>
    ) : (
      <div className="text-sm opacity-50 select-none">
        End
      </div>
    )}
  </div>
)}
  </div>
);

}
