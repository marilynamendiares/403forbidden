// src/components/chapter/ChapterComposer.tsx
"use client";

import { useState } from "react";

export function ChapterComposer({
  slug,
  index,
  disabled,
}: {
  slug: string;
  index: number | string;
  disabled?: boolean;
}) {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!val.trim() || busy) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`/api/books/${slug}/${index}/posts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ contentMd: val }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const msg =
          json?.error || `Failed (${res.status}) — ${res.statusText || "Unknown error"}`;
        throw new Error(msg);
      }

      // успех: чистим поле и ждём SSE `chapter:new_post`
      setVal("");
    } catch (err: any) {
      setError(err.message ?? "Failed to post");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-2">
      <textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        rows={4}
        className="w-full resize-y rounded-md border border-neutral-700 bg-transparent p-2 text-sm"
        placeholder={disabled ? "Posting is disabled for this chapter." : "Write your post…"}
        disabled={busy || disabled}
      />

      <div className="flex justify-between items-center text-sm">
        {error && <span className="text-red-500">{error}</span>}
        <button
          type="submit"
          className="px-3 py-1 rounded-md border border-neutral-700 hover:bg-neutral-800 disabled:opacity-50"
          disabled={busy || disabled || !val.trim()}
        >
          {busy ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
