// src/components/ChapterEditorClient.tsx
"use client";

// ===== Imports ================================================================
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Markdown from "@/components/Markdown";
import { computeReadingStats } from "@/lib/readingTime";

// ===== Types ==================================================================
type Props = {
  chapterId: string;
  canEdit: boolean;
  defaultTitle: string;
  defaultContent: string;
  onSave: (formData: FormData) => Promise<void> | void; // server action из page.tsx
};

type LockInfo = { userId: string; username?: string; since?: number };

// ===== Soft-lock: tab id =====================================================
function useTabId() {
  return useMemo(() => {
    try {
      const k = "tabId";
      const cur = sessionStorage.getItem(k);
      if (cur) return cur;
      const id = crypto.randomUUID();
      sessionStorage.setItem(k, id);
      return id;
    } catch {
      return Math.random().toString(36).slice(2);
    }
  }, []);
}

// ===== Soft-lock: heartbeat client hook ======================================
function useChapterLockClient(chapterId: string, canEdit: boolean) {
  const tabId = useTabId();
  const [lockedBy, setLockedBy] = useState<LockInfo | null>(null);
  const [mine, setMine] = useState(false);
  const timer = useRef<number | null>(null);

  async function beat() {
    if (!canEdit) return;
    try {
      const res = await fetch("/api/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "chapter",
          id: chapterId,
          action: "acquire_or_beat",
          tabId,
        }),
      });

      if (res.status === 423) {
        const data = await res.json().catch(() => null);
        setMine(false);
        setLockedBy(data?.lockedBy ?? null);
      } else {
        const data = await res.json().catch(() => null);
        setMine(Boolean(data?.mine));
        setLockedBy(null);
      }
    } catch {
      // ignore transient errors
    }
  }

  useEffect(() => {
    if (!canEdit || !chapterId) return;
    beat();

    const pulse = () => beat();
    const evs: Array<[keyof DocumentEventMap | keyof WindowEventMap, Document | Window]> = [
      ["keydown", window],
      ["input", document],
      ["visibilitychange", document],
      ["focus", window],
      ["paste", document],
      ["selectionchange", document],
    ];
    evs.forEach(([e, t]) => t.addEventListener(e as any, pulse, { passive: true } as any));
    timer.current = window.setInterval(beat, 25_000);

    return () => {
      evs.forEach(([e, t]) => t.removeEventListener(e as any, pulse as any));
      if (timer.current) window.clearInterval(timer.current);
      fetch("/api/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          resource: "chapter",
          id: chapterId,
          action: "release",
          tabId,
        }),
      }).catch(() => {});
    };
  }, [canEdit, chapterId, tabId]);

  return { mine, lockedBy };
}

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

  // --- soft-lock state --------------------------------------------------------
  const { mine, lockedBy } = useChapterLockClient(chapterId, canEdit);
  const disabled = canEdit ? (!mine && !!lockedBy) : true;

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

  const dirty = title !== baseline.title || content !== baseline.content;

  // --- подгружаем локальный драфт при монтировании ----------------------------
  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;

      const parsed = JSON.parse(raw) as { title?: string; content?: string } | null;
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
        // у главы уже есть текст → требуем непустой контент в драфте
        hasMeaningful = !draftContentEmpty;
      } else {
        // пустой/новый контент на сервере
        hasMeaningful =
          !draftContentEmpty || (t.trim().length > 0 && t !== baselineTitle);
      }

      const differsFromBaseline = t !== baselineTitle || c !== baselineContent;

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

  // --- авто-сохранение локального драфта (debounce) --------------------------
  useEffect(() => {
    if (!draftKey) return;

    // если вообще нет изменений — просто очищаем состояние
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

        const differsFromBaseline = t !== baselineTitle || c !== baselineContent;

        if (!hasMeaningful || !differsFromBaseline) {
          localStorage.removeItem(draftKey);
          setSaveState("idle");
          setLastSavedAt(null);
          return;
        }

        localStorage.setItem(draftKey, JSON.stringify({ title: t, content: c }));
        setSaveState("saved");
        setLastSavedAt(Date.now());
      } catch {
        // ignore
      }
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [title, content, draftKey, dirty, baseline.title, baseline.content]);

  // --- discard локального драфта ---------------------------------------------
  const discardLocalDraft = () => {
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
  };

  // --- сохранение (server action) --------------------------------------------
  const doSave = () => {
    if (disabled || pending) return;
    const fd = new FormData();
    fd.set("title", title);
    fd.set("content", content);

    startTransition(async () => {
      await onSave(fd);
      // После успешного сервера страница перерендерится с новым baseline.
    });
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, pending, title, content]);

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
  let statusLabel = "No local changes";
  if (saveState === "saving") {
    statusLabel = "Saving draft…";
  } else if (saveState === "saved" && lastSavedAt) {
    const sec = Math.round((Date.now() - lastSavedAt) / 1000);
    if (sec <= 2) statusLabel = "Draft saved just now";
    else statusLabel = `Draft saved ${sec}s ago`;
  } else if (dirty) {
    statusLabel = "Unsaved changes";
  }

  // ===== UI helpers ===========================================================

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 text-xs border border-neutral-800/80 bg-neutral-950/80 rounded-lg px-2 py-1">
      <button
        type="button"
        onClick={() => wrapInline("**", "**")}
        className="px-2 py-1 rounded hover:bg-neutral-800"
      >
        <span className="font-semibold">B</span>
      </button>
      <button
        type="button"
        onClick={() => wrapInline("*", "*")}
        className="px-2 py-1 rounded italic hover:bg-neutral-800"
      >
        I
      </button>
      <button
        type="button"
        onClick={() => wrapInline("`", "`")}
        className="px-2 py-1 rounded font-mono text-[11px] hover:bg-neutral-800"
      >
        `code`
      </button>
      <button
        type="button"
        onClick={insertCodeBlock}
        className="px-2 py-1 rounded font-mono text-[11px] hover:bg-neutral-800"
      >
        code block
      </button>
      <span className="mx-1 h-4 w-px bg-neutral-800" />
      <button
        type="button"
        onClick={makeHeading}
        className="px-2 py-1 rounded hover:bg-neutral-800"
      >
        H2
      </button>
      <button
        type="button"
        onClick={makeQuote}
        className="px-2 py-1 rounded hover:bg-neutral-800"
      >
        &gt; quote
      </button>
      <button
        type="button"
        onClick={insertDivider}
        className="px-2 py-1 rounded hover:bg-neutral-800"
      >
        ---
      </button>
      <button
        type="button"
        onClick={insertLink}
        className="px-2 py-1 rounded hover:bg-neutral-800"
      >
        link
      </button>
    </div>
  );

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
      {/* заголовок + статы + preview-toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div
            className={
              "text-xs uppercase tracking-wide " +
              (isPreview ? "text-emerald-300" : "text-neutral-500")
            }
          >
            {isPreview ? "Preview mode" : "Edit chapter"}
          </div>
          <div className="text-xs text-neutral-500">
            {stats.words} words · {stats.chars} chars
            {stats.minutes > 0 && <> · ~ {stats.minutes} min read</>}
          </div>

          {draftRestored && (
            <div className="mt-1 inline-flex items-center gap-2 text-xs">
              <span className="text-amber-300">Local draft restored</span>
              <button
                type="button"
                onClick={discardLocalDraft}
                className="rounded-full border border-amber-500/60 px-2.5 py-0.5 text-[11px] text-amber-100 hover:bg-amber-500/10"
              >
                Discard draft
              </button>
            </div>
          )}

          <div className="mt-1 text-xs text-neutral-500">{statusLabel}</div>
        </div>

        {/* справа — только кнопка превью */}
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <button
            type="button"
            onClick={() => setMode(isPreview ? "edit" : "preview")}
            className={
              "flex h-8 w-8 items-center justify-center rounded-full border text-sm transition " +
              (isPreview
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-neutral-700 bg-black/40 hover:bg-neutral-800")
            }
            title={isPreview ? "Back to editing" : "Preview"}
          >
            👁
          </button>
        </div>
      </div>

      {toolbar}

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

        {disabled && lockedBy && (
          <span className="text-xs opacity-70">
            Locked by @{lockedBy.username ?? lockedBy.userId}
          </span>
        )}
      </div>

      <p className="opacity-60 text-xs">
        Only owner or chapter author can edit. Local draft is stored in this
        browser only.
      </p>
    </form>
  );
}
