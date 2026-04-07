// src/components/ChapterEditorClient.tsx
"use client";

// ===== Imports ================================================================
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Markdown from "@/components/Markdown";
import { computeReadingStats } from "@/lib/readingTime";
import { useStableEvent } from "@/hooks/useStableEvent";
import { clearDraft, readDraft, writeDraft } from "@/lib/draftStorage";
import { getWriterSaveErrorMessage, getWriterStatusLabel } from "@/lib/writerStatus";
import {
  ChapterEditorStatusBar,
  ChapterMarkdownToolbar,
} from "@/components/chapter/ChapterEditorUi";

// ===== Types ==================================================================
type Props = {
  chapterId: string;
  canEdit: boolean;
  defaultTitle: string;
  defaultContent: string;
  onSave: (formData: FormData) => Promise<void> | void; // server action из page.tsx
};

// ===== Component ==============================================================

export default function ChapterEditorClient({
  chapterId,
  canEdit,
  defaultTitle,
  defaultContent,
  onSave,
}: Props) {
  // --- baseline (серверная версия) -------------------------------------------
  const baseline = useMemo(
    () => ({
      title: defaultTitle,
      content: defaultContent,
    }),
    [defaultTitle, defaultContent]
  );

  const disabled = !canEdit;

  // --- local state ------------------------------------------------------------
  const [title, setTitle] = useState(defaultTitle);
  const [content, setContent] = useState(defaultContent);
  const [pending, startTransition] = useTransition();

  // режим редактора: редактирование / превью
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const isPreview = mode === "preview";

  // статистика для строки "X words · Y chars · ~N min read"
  const stats = useMemo(() => computeReadingStats(content), [content]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // локальный драфт
  const draftKey = useMemo(
    () => (chapterId ? `chapter_draft:${chapterId}` : ""),
    [chapterId]
  );
  const [draftRestored, setDraftRestored] = useState(false);

  // статус локального сохранения
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dirty = title !== baseline.title || content !== baseline.content;

  // --- подгружаем локальный драфт при монтировании ----------------------------
  useEffect(() => {
    if (!draftKey) return;
    const parsed = readDraft<{ title?: string; content?: string }>(draftKey);
    if (!parsed) return;

    if (typeof parsed.title !== "string" || typeof parsed.content !== "string") {
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

    const differsFromBaseline = t !== baselineTitle || c !== baselineContent;

    if (!hasMeaningful || !differsFromBaseline) {
      clearDraft(draftKey);
      return;
    }

    setTitle(t);
    setContent(c);
    setDraftRestored(true);
    setSaveError(null);
  }, [draftKey, baseline.title, baseline.content]);

  // --- авто-сохранение локального драфта (debounce) --------------------------
  useEffect(() => {
    if (!draftKey) return;

    // если вообще нет изменений — просто очищаем состояние
    if (!dirty) {
      clearDraft(draftKey);
      setSaveState("idle");
      setLastSavedAt(null);
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

      const differsFromBaseline = t !== baselineTitle || c !== baselineContent;

      if (!hasMeaningful || !differsFromBaseline) {
        clearDraft(draftKey);
        setSaveState("idle");
        setLastSavedAt(null);
        return;
      }

      if (writeDraft(draftKey, { title: t, content: c })) {
        setSaveState("saved");
        setLastSavedAt(Date.now());
      }
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [title, content, draftKey, dirty, baseline.title, baseline.content]);

  // --- discard локального драфта ---------------------------------------------
  const discardLocalDraft = () => {
    if (!draftKey) return;
    clearDraft(draftKey);

    setTitle(baseline.title);
    setContent(baseline.content);
    setDraftRestored(false);
    setSaveState("idle");
    setLastSavedAt(null);
    setSaveError(null);
  };

  // --- сохранение (server action) --------------------------------------------
  const doSave = useStableEvent(() => {
    if (disabled || pending) return;
    const fd = new FormData();
    fd.set("title", title);
    fd.set("content", content);

    startTransition(async () => {
      try {
        await onSave(fd);
        setSaveError(null);
        // После успешного сервера страница перерендерится с новым baseline.
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Failed to save chapter text.";
        setSaveError(getWriterSaveErrorMessage(message, "chapter text"));
      }
    });
  });

  useEffect(() => {
    if (!dirty) {
      setSaveError(null);
    }
  }, [dirty]);

  // --- hotkey: Cmd/Ctrl + S ---------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        doSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doSave]);

  // --- toolbar helpers --------------------------------------------------------
  function withSelection(
    fn: (
      value: string,
      selStart: number,
      selEnd: number
    ) => { value: string; newStart: number; newEnd: number }
  ) {
    const el = textareaRef.current;
    if (!el) return;

    const value = content;
    const selStart = el.selectionStart ?? 0;
    const selEnd = el.selectionEnd ?? 0;

    const res = fn(value, selStart, selEnd);
    setContent(res.value);

    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(res.newStart, res.newEnd);
    });
  }

  const wrapInline = (before: string, after: string = before) => {
    withSelection((value, start, end) => {
      const selected = value.slice(start, end) || "text";
      const prefix = value.slice(0, start);
      const suffix = value.slice(end);

      const next = prefix + before + selected + after + suffix;
      const newStart = prefix.length + before.length;
      const newEnd = newStart + selected.length;

      return { value: next, newStart, newEnd };
    });
  };

  const makeHeading = () => {
    withSelection((value, start, end) => {
      const lines = value.split("\n");
      let charCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const lineStart = charCount;
        const lineEnd = charCount + lines[i].length;

        if (start >= lineStart && start <= lineEnd) {
          const line = lines[i].replace(/^#+\s*/, "");
          lines[i] = `## ${line || "Heading"}`;
          break;
        }
        charCount = lineEnd + 1; // +1 за \n
      }

      const next = lines.join("\n");
      return { value: next, newStart: start, newEnd: end };
    });
  };

  const makeQuote = () => {
    withSelection((value, start, end) => {
      const selected = value.slice(start, end) || "Quote";
      const lines = selected.split("\n").map((l) => (l ? `> ${l}` : ">"));
      const block = lines.join("\n");
      const prefix = value.slice(0, start);
      const suffix = value.slice(end);
      const next = prefix + block + suffix;
      const newStart = prefix.length;
      const newEnd = newStart + block.length;
      return { value: next, newStart, newEnd };
    });
  };

  const insertDivider = () => {
    withSelection((value, start, end) => {
      const prefix = value.slice(0, start);
      const suffix = value.slice(end);
      const insert = (prefix.endsWith("\n") ? "" : "\n\n") + "---\n\n";
      const next = prefix + insert + suffix;
      const newPos = (prefix + insert).length;
      return { value: next, newStart: newPos, newEnd: newPos };
    });
  };

  const insertLink = () => {
    withSelection((value, start, end) => {
      const selected = value.slice(start, end) || "link text";
      const prefix = value.slice(0, start);
      const suffix = value.slice(end);
      const snippet = `[${selected}](https://example.com)`;
      const next = prefix + snippet + suffix;
      const newStart = prefix.length + 1;
      const newEnd = newStart + selected.length;
      return { value: next, newStart, newEnd };
    });
  };

  const insertCodeBlock = () => {
    withSelection((value, start, end) => {
      const selected = value.slice(start, end) || "code";
      const prefix = value.slice(0, start);
      const suffix = value.slice(end);
      const block = "```\n" + selected + "\n```\n";
      const next = prefix + block + suffix;
      const newStart = prefix.length + 4; // внутри блока, после ```\n
      const newEnd = newStart + selected.length;
      return { value: next, newStart, newEnd };
    });
  };

  // --- статус сохранения ------------------------------------------------------
  const hasDraftState = draftRestored || dirty || saveState === "saving" || saveState === "saved";
  const statusLabel = getWriterStatusLabel({
    draftRestored,
    hasDraftState,
    saveState,
    dirty,
    lastSavedAt,
  });

  // ===== UI helpers ===========================================================

  // ===== RENDER ==============================================================

  return (
    <form
      action={(fd: FormData) => {
        fd.set("title", title);
        fd.set("content", content);
        startTransition(async () => {
          await onSave(fd);
        });
      }}
      className="space-y-3"
    >
      <ChapterEditorStatusBar
        isPreview={isPreview}
        words={stats.words}
        chars={stats.chars}
        minutes={stats.minutes}
        draftRestored={draftRestored}
        statusLabel={statusLabel}
        saveError={saveError}
        onDiscardDraft={discardLocalDraft}
        onTogglePreview={() => setMode(isPreview ? "edit" : "preview")}
      />

      <ChapterMarkdownToolbar
        onBold={() => wrapInline("**", "**")}
        onItalic={() => wrapInline("*", "*")}
        onInlineCode={() => wrapInline("`", "`")}
        onCodeBlock={insertCodeBlock}
        onHeading={makeHeading}
        onQuote={makeQuote}
        onDivider={insertDivider}
        onLink={insertLink}
      />

      {/* Title */}
      <input
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded bg-transparent border border-neutral-700 px-3 py-2"
        required
        disabled={disabled}
        placeholder="Title"
      />

      {/* Content: edit / preview */}
      {mode === "edit" ? (
        <textarea
          ref={textareaRef}
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded bg-transparent border border-neutral-700 px-3 py-2 font-mono text-sm min-h-60"
          rows={10}
          required
          disabled={disabled}
          placeholder="Markdown content…"
        />
      ) : (
        <div className="rounded border border-neutral-800 px-3 py-3 bg-neutral-950/60">
          <Markdown>{content || "_Nothing to preview yet…_"}</Markdown>
        </div>
      )}

      {/* actions */}
      <div className="flex items-center gap-3">
        <button
          id="save-btn"
          type="submit"
          className="rounded bg-white text-black px-4 py-2 disabled:opacity-50"
          disabled={disabled || pending}
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>

      <p className="opacity-60 text-xs">
        Only the chapter author can edit. Local draft is stored in this
        browser only.
      </p>
    </form>
  );
}
