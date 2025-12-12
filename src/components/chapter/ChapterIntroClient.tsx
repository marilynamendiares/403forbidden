// src/components/chapter/ChapterIntroClient.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { RichPostEditor } from "@/components/editor/RichPostEditor";

type Props = {
  chapterId: string; // 🆕 нужен для уникального ключа драфта
  canEdit: boolean;
  defaultTitle: string;
  defaultContent: string; // HTML от Tiptap (или markdown у старых глав)
  onSave: (formData: FormData) => Promise<void> | void;
};

// простая статистика
function getStats(text: string) {
  const plain = text
    .replace(/<[^>]+>/g, " ") // выкидываем теги
    .replace(/\s+/g, " ")
    .trim();

  const words = plain ? plain.split(" ").length : 0;
  const chars = plain.length;
  const minutes = words ? Math.max(1, Math.round(words / 200)) : 0;

  return { words, chars, minutes };
}

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

  const stats = useMemo(() => getStats(content), [content]);

  const dirty =
    title !== baseline.title || content !== baseline.content;

  // 🆕 локальный драфт
  const draftKey = useMemo(
    () => (chapterId ? `chapter_intro:${chapterId}` : ""),
    [chapterId]
  );
  const [draftRestored, setDraftRestored] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // загрузка драфта при монтировании
  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;

      const parsed = JSON.parse(raw) as
        | { title?: string; content?: string }
        | null;
      if (!parsed) return;
      if (
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
        // у главы уже есть текст → драфт должен быть не пустой
        hasMeaningful = !draftContentEmpty;
      } else {
        // у сервера пусто → достаточно непустого контента или иного title
        hasMeaningful =
          !draftContentEmpty || (t.trim().length > 0 && t !== baselineTitle);
      }

      const differsFromBaseline =
        t !== baselineTitle || c !== baselineContent;

      if (!hasMeaningful || !differsFromBaseline) {
        localStorage.removeItem(draftKey);
        return;
      }

      setTitle(t);
      setContent(c);
      setDraftRestored(true);
    } catch {
      // ignore
    }
  }, [draftKey, baseline.title, baseline.content]);

  // авто-сохранение драфта (debounce)
  useEffect(() => {
    if (!draftKey) return;

    if (!dirty) {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
      setSaveState("idle");
      setLastSavedAt(null);
      return;
    }

    setSaveState("saving");

    const timeout = window.setTimeout(() => {
      try {
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
          localStorage.removeItem(draftKey);
          setSaveState("idle");
          setLastSavedAt(null);
          return;
        }

        localStorage.setItem(
          draftKey,
          JSON.stringify({ title: t, content: c })
        );
        setSaveState("saved");
        setLastSavedAt(Date.now());
      } catch {
        // ignore
      }
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [title, content, draftKey, dirty, baseline.title, baseline.content]);

  function discardLocalDraft() {
    if (!draftKey) return;
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    setTitle(baseline.title);
    setContent(baseline.content);
    setDraftRestored(false);
    setSaveState("idle");
    setLastSavedAt(null);
  }

  // статусная строчка
  let statusLabel = "No local changes";
  if (saveState === "saving") {
    statusLabel = "Saving draft…";
  } else if (saveState === "saved" && lastSavedAt) {
    const sec = Math.round((Date.now() - lastSavedAt) / 1000);
    statusLabel = sec <= 2 ? "Draft saved just now" : `Draft saved ${sec}s ago`;
  } else if (dirty) {
    statusLabel = "Unsaved changes";
  }

  function handleSave() {
    if (!canEdit || isPending) return;
    const fd = new FormData();
    fd.set("title", title);
    fd.set("content", content);

    startTransition(async () => {
      await onSave(fd);
      setEditing(false);
      // после успешного сохранения страница перерендерится с новым baseline,
      // а эффект автосейва сам очистит драфт
    });
  }

  function handleCancel() {
    if (isPending) return;
    setEditing(false);
    // откатываемся к baseline и чистим драфт
    discardLocalDraft();
  }

  // хоткей Cmd/Ctrl+S только в режиме редактирования
  useEffect(() => {
    if (!editing) return;

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", onKey as any);
    return () => window.removeEventListener("keydown", onKey as any);
  }, [editing, title, content, canEdit, isPending]); // deps ок

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

        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-4 rounded-full border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-900"
          >
            Edit chapter
          </button>
        )}
      </section>
    );
  }


  // ────────────────────────────────────────────────────────────────────────────
  // EDIT MODE (rich editor поверх интро)
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <section className="mt-4 space-y-3">
      {/* шапка режима редактирования */}
      <div className="flex flex-col gap-1 text-xs">
        <span className="uppercase tracking-wide text-neutral-500">
          EDITING CHAPTER
        </span>
        {draftRestored && (
          <div className="inline-flex items-center gap-2 text-amber-300">
            <span>Local draft restored</span>
            <button
              type="button"
              onClick={discardLocalDraft}
              className="rounded-full border border-amber-500/60 px-2.5 py-0.5 text-[11px] text-amber-100 hover:bg-amber-500/10"
            >
              Discard draft
            </button>
          </div>
        )}
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
          />
        </div>

        {/* низ: слева Save/Cancel, справа — статистика */}
        <div className="flex items-center justify-between pt-1">
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

          <p className="text-[11px] opacity-60 leading-snug text-right">
            {stats.words} words · {stats.chars} chars
            {stats.minutes > 0 && <> · ~ {stats.minutes} min read</>} ·{" "}
            {statusLabel}
            <br />
            Only owner or chapter author can edit.
          </p>
        </div>
      </div>
    </section>
  );
}
