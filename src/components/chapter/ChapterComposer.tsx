// src/components/chapter/ChapterComposer.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { RichPostEditor } from "@/components/editor/RichPostEditor";

export function ChapterComposer({
  slug,
  index,
  disabled,
  nextChapterIndex,
}: {
  slug: string;
  index: number | string;
  disabled?: boolean;
  nextChapterIndex?: number | null;
}) {
  const [val, setVal] = useState(""); // HTML из редактора
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  /**
   * Пост считается валидным если:
   *  1) есть текст (после удаления HTML)
   *  2) или присутствует хотя бы одна картинка <img>
   */
  function hasMeaningfulContent(html: string) {
    if (!html) return false;

    // Проверяем текст
    const text = html
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, "") // удаляем теги → оставляем только текст
      .replace(/&nbsp;/g, " ")
      .trim();

    if (text.length > 0) return true;

    // Проверяем наличие картинок
    if (/<img\b[^>]*>/i.test(html)) return true;

    return false;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || disabled) return;
    if (!hasMeaningfulContent(val)) return;

    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`/api/books/${slug}/${index}/posts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ contentMd: val }), // пока храним HTML в contentMd
      });

      if (!res.ok) {
        let msg = `Failed (${res.status})`;
        try {
          const json = await res.json();
          msg = json?.error || msg;
        } catch {}
        throw new Error(msg);
      }

      // Успех → очищаем редактор. SSE подхватит новый пост сам.
      setVal("");
      setOpen(false);
    } catch (err: any) {
      setError(err.message ?? "Failed to post");
    } finally {
      setBusy(false);
    }
  }

  const cannotPost = busy || disabled || !hasMeaningfulContent(val);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-4">
        {!disabled ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm text-[#2D2D2D] transition hover:bg-[#2D2D2D]/5"
          >
            <span>{open ? "–" : "+"}</span>
            <span>New Post</span>
          </button>
        ) : (
          <span />
        )}

        {nextChapterIndex ? (
          <Link
            href={`/arcs/${slug}/${nextChapterIndex}`}
            className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm text-[#2D2D2D] transition hover:bg-[#2D2D2D]/5"
          >
            Next chapter →
          </Link>
        ) : (
          <div className="text-sm select-none opacity-50">End</div>
        )}
      </div>

      {open && (
        <form onSubmit={onSubmit} className="mt-4 grid gap-2">
          <RichPostEditor
            value={val}
            onChange={setVal}
            disabled={busy || disabled}
            tone="light"
          />

          <div className="flex items-center justify-between text-sm">
            {error && <span className="text-red-500">{error}</span>}
            <button
              type="submit"
              className="rounded-md border border-neutral-700 px-3 py-1 text-[#2D2D2D] hover:bg-[#2D2D2D]/5 disabled:opacity-50"
              disabled={cannotPost}
            >
              {busy ? "Posting…" : "Post"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
