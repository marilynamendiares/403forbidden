// src/components/chapter/ChapterComposer.tsx
"use client";

import { useState } from "react";
import { RichPostEditor } from "@/components/editor/RichPostEditor";

export function ChapterComposer({
  slug,
  index,
  disabled,
}: {
  slug: string;
  index: number | string;
  disabled?: boolean;
}) {
  const [val, setVal] = useState(""); // HTML из редактора
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err.message ?? "Failed to post");
    } finally {
      setBusy(false);
    }
  }

  const cannotPost = busy || disabled || !hasMeaningfulContent(val);

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-2">
      <RichPostEditor value={val} onChange={setVal} disabled={busy || disabled} />

      <div className="flex justify-between items-center text-sm">
        {error && <span className="text-red-500">{error}</span>}
        <button
          type="submit"
          className="px-3 py-1 rounded-md border border-neutral-700 hover:bg-neutral-800 disabled:opacity-50"
          disabled={cannotPost}
        >
          {busy ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
