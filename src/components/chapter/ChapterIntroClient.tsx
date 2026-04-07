// src/components/chapter/ChapterIntroClient.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { RichPostEditor } from "@/components/editor/RichPostEditor";
import { useStableEvent } from "@/hooks/useStableEvent";
import { clearDraft, readDraft, writeDraft } from "@/lib/draftStorage";
import { getWriterSaveErrorMessage, getWriterStatusLabel } from "@/lib/writerStatus";
import { WriterStatusNotice } from "@/components/writer/WriterStatusNotice";
import {
  ChapterIntroDraftActions,
  ChapterIntroViewActions,
} from "@/components/chapter/ChapterIntroUi";

type Props = {
  chapterId: string; // 🆕 нужен для уникального ключа драфта
  canEdit: boolean;
  defaultTitle: string;
  defaultContent: string; // HTML от Tiptap (или markdown у старых глав)
  onSave: (formData: FormData) => Promise<void> | void;
};

export function ChapterIntroClient({
  chapterId,
  canEdit,
  defaultTitle,
  defaultContent,
  onSave,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [content, setContent] = useState(defaultContent);
  const [isPending, startTransition] = useTransition();

  // baseline, от которого считаем "грязность"
  const baseline = useMemo(
    () => ({ title: defaultTitle, content: defaultContent }),
    [defaultTitle, defaultContent]
  );

  // если сервер прислал новые значения — подхватываем их как новый baseline
  useEffect(() => {
    setTitle(defaultTitle);
  }, [defaultTitle]);

  useEffect(() => {
    setContent(defaultContent);
  }, [defaultContent]);

  const dirty =
    title !== baseline.title || content !== baseline.content;

  // 🆕 локальный драфт
  const draftKey = useMemo(
    () => (chapterId ? `chapter_intro:${chapterId}` : ""),
    [chapterId]
  );
  const [draftRestored, setDraftRestored] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // загрузка драфта при монтировании
  useEffect(() => {
    if (!draftKey) return;
    const parsed = readDraft<{ title?: string; content?: string }>(draftKey);
    if (
      !parsed ||
      typeof parsed.title !== "string" ||
      typeof parsed.content !== "string"
    ) {
      return;
    }

    const t = parsed.title;
    const c = parsed.content;

    const baselineTitle = baseline.title;
    const baselineContent = baseline.content;

    const baselineContentEmpty = baselineContent.trim().length === 0;
    const draftContentEmpty = c.trim().length === 0;

    let hasMeaningful = false;
    if (!baselineContentEmpty) {
      hasMeaningful = !draftContentEmpty;
    } else {
      hasMeaningful =
        !draftContentEmpty || (t.trim().length > 0 && t !== baselineTitle);
    }

    const differsFromBaseline =
      t !== baselineTitle || c !== baselineContent;

    if (!hasMeaningful || !differsFromBaseline) {
      clearDraft(draftKey);
      return;
    }

    setTitle(t);
    setContent(c);
    setDraftRestored(true);
    setSaveError(null);
  }, [draftKey, baseline.title, baseline.content]);

  // авто-сохранение драфта (debounce)
  useEffect(() => {
    if (!draftKey) return;

    if (!dirty) {
      clearDraft(draftKey);
      setSaveState("idle");
      return;
    }

    setSaveState("saving");

    const timeout = window.setTimeout(() => {
      const baselineTitle = baseline.title;
      const baselineContent = baseline.content;
      const t = title;
      const c = content;

      const baselineContentEmpty = baselineContent.trim().length === 0;
      const draftContentEmpty = c.trim().length === 0;

      let hasMeaningful = false;
      if (!baselineContentEmpty) {
        hasMeaningful = !draftContentEmpty;
      } else {
        hasMeaningful =
          !draftContentEmpty || (t.trim().length > 0 && t !== baselineTitle);
      }

      const differsFromBaseline =
        t !== baselineTitle || c !== baselineContent;

      if (!hasMeaningful || !differsFromBaseline) {
        clearDraft(draftKey);
        setSaveState("idle");
        return;
      }

      if (writeDraft(draftKey, { title: t, content: c })) {
        setSaveState("saved");
      }
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [title, content, draftKey, dirty, baseline.title, baseline.content]);

  function discardLocalDraft() {
    if (!draftKey) return;
    clearDraft(draftKey);
    setTitle(baseline.title);
    setContent(baseline.content);
    setDraftRestored(false);
    setSaveState("idle");
    setSaveError(null);
  }

  const hasDraftState = draftRestored || dirty || saveState === "saving" || saveState === "saved";
  const statusLabel = getWriterStatusLabel({
    draftRestored,
    hasDraftState,
    saveState,
    dirty,
  });

  useEffect(() => {
    if (!dirty) {
      setSaveError(null);
    }
  }, [dirty]);

  const handleSave = useStableEvent(async () => {
    if (!canEdit || isPending) return;
    const fd = new FormData();
    fd.set("title", title);
    fd.set("content", content);

    startTransition(async () => {
      try {
        await onSave(fd);
        setSaveError(null);
        setEditing(false);
        // после успешного сохранения страница перерендерится с новым baseline,
        // а эффект автосейва сам очистит драфт
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Failed to save chapter intro.";
        setSaveError(getWriterSaveErrorMessage(message, "chapter intro"));
      }
    });
  });

  async function handleCancel() {
    if (isPending) return;
    setEditing(false);
    discardLocalDraft();
  }

  // хоткей Cmd/Ctrl+S только в режиме редактирования
  useEffect(() => {
    if (!editing) return;

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, handleSave]);


  // ────────────────────────────────────────────────────────────────────────────
  // VIEW MODE
  // ────────────────────────────────────────────────────────────────────────────
  if (!editing) {
    const publishedContent = baseline.content; // всегда то, что пришло с сервера

    return (
      <section className="space-y-4">
        {publishedContent ? (
          <div
            className="post-body prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: publishedContent }}
          />
        ) : (
          <p className="opacity-60 text-sm">
            No intro text yet. Click “Edit chapter” to add one.
          </p>
        )}

        <ChapterIntroViewActions
          canEdit={canEdit}
          onEdit={async () => {
            setEditing(true);
          }}
        />

      </section>
    );
  }


  // ────────────────────────────────────────────────────────────────────────────
  // EDIT MODE (rich editor поверх интро)
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <section className="mt-4 space-y-3">
      <WriterStatusNotice message={saveError} />
      {/* шапка режима редактирования */}
      <div className="flex flex-col gap-1 text-xs">
        <span className="uppercase tracking-wide text-neutral-500">
          EDITING CHAPTER
        </span>
      </div>

      {/* заголовок + текст интро */}
      <div className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-neutral-700 bg-transparent px-3 py-2 text-base"
          placeholder="Chapter title…"
          disabled={!canEdit || isPending}

        />

        <div className="post-body prose prose-invert max-w-none">
          <RichPostEditor
            value={content}
            onChange={setContent}
            disabled={!canEdit || isPending}
            tone="light"
          />
        </div>

        {/* низ: слева Save/Cancel, справа — статус локального драфта */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <div className="flex gap-3 text-xs text-muted-foreground">
<button
  type="button"
  onClick={handleSave}
  disabled={!dirty || isPending || !canEdit}
  className="hover:text-foreground disabled:opacity-50"
>

              {isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          <ChapterIntroDraftActions
            statusLabel={statusLabel}
            hasDraftState={hasDraftState}
            onDiscardDraft={discardLocalDraft}
            disabled={isPending}
          />
        </div>
      </div>
    </section>
  );
}
