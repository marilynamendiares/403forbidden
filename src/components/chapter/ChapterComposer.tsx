// src/components/chapter/ChapterComposer.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RichPostEditor } from "@/components/editor/RichPostEditor";
import { clearDraft, readDraft, writeDraft } from "@/lib/draftStorage";
import { getWriterSaveErrorMessage, getWriterStatusLabel } from "@/lib/writerStatus";
import { WriterStatusNotice } from "@/components/writer/WriterStatusNotice";
import {
  createChapterPost,
  type ChapterPostListItem,
} from "@/lib/chapterPostsClient";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Failed to post";
}

export function ChapterComposer({
  slug,
  index,
  disabled,
  nextChapterIndex,
  onPosted,
}: {
  slug: string;
  index: number | string;
  disabled?: boolean;
  nextChapterIndex?: number | null;
  onPosted?: (post: ChapterPostListItem) => void;
}) {
  const [val, setVal] = useState(""); // HTML из редактора
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const draftKey = useMemo(
    () => `chapter_post_composer_draft:${slug}:${index}`,
    [slug, index]
  );

  const dirty = val.trim().length > 0;
  const hasDraftState = draftRestored || dirty || saveState === "saving" || saveState === "saved";
  const statusLabel = getWriterStatusLabel({
    draftRestored,
    hasDraftState,
    saveState,
    dirty,
  });

  useEffect(() => {
    if (!open) return;

    const parsed = readDraft<{ content?: string }>(draftKey);
    if (!parsed || typeof parsed.content !== "string" || parsed.content.trim().length === 0) {
      setDraftRestored(false);
      return;
    }

    setVal(parsed.content);
    setDraftRestored(true);
    setSaveState("saved");
    setError(null);
  }, [open, draftKey]);

  useEffect(() => {
    if (!open) return;

    if (!dirty) {
      clearDraft(draftKey);
      setDraftRestored(false);
      setSaveState("idle");
      return;
    }

    setSaveState("saving");

    const timeout = window.setTimeout(() => {
      if (writeDraft(draftKey, { content: val })) {
        setSaveState("saved");
      }
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [open, dirty, draftKey, val]);

  function discardLocalDraft() {
    clearDraft(draftKey);
    setVal("");
    setDraftRestored(false);
    setSaveState("idle");
    setError(null);
  }

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
      const createdPost = await createChapterPost({
        slug,
        index,
        contentMd: val,
      });

      if (createdPost) {
        onPosted?.(createdPost);
      }

      // Успех → очищаем редактор. SSE подхватит новый пост сам.
      clearDraft(draftKey);
      setVal("");
      setDraftRestored(false);
      setSaveState("idle");
      setOpen(false);
    } catch (err: unknown) {
      setError(getWriterSaveErrorMessage(getErrorMessage(err), "chapter post"));
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

          <div className="space-y-2">
            <WriterStatusNotice message={error} />
            <div className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-3 text-xs text-neutral-500">
                {hasDraftState ? <span>{statusLabel}</span> : null}
                {hasDraftState ? (
                  <button
                    type="button"
                    onClick={discardLocalDraft}
                    className="hover:text-[#2D2D2D]"
                  >
                    discard local draft
                  </button>
                ) : null}
              </div>
              <button
                type="submit"
                className="rounded-md border border-neutral-700 px-3 py-1 text-[#2D2D2D] hover:bg-[#2D2D2D]/5 disabled:opacity-50"
                disabled={cannotPost}
              >
                {busy ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
