// src/components/ChapterEditorClient.tsx
"use client";

// ===== Imports ================================================================
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

// ===== Types =================================================================
type Props = {
  chapterId: string;
  canEdit: boolean;
  defaultTitle: string;
  defaultContent: string;
  onSave: (formData: FormData) => Promise<void> | void; // server action из page.tsx
};

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
  const [lockedBy, setLockedBy] = useState<{ userId: string; username?: string } | null>(null);
  const [mine, setMine] = useState(false);
  const timer = useRef<number | null>(null);

  async function beat() {
    if (!canEdit) return;
    try {
      const res = await fetch("/api/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "chapter", id: chapterId, action: "acquire_or_beat", tabId }),
      });
      if (res.status === 423) {
        const data = await res.json();
        setMine(false);
        setLockedBy(data.lockedBy ?? null);
      } else {
        const data = await res.json();
        setMine(Boolean(data.mine));
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
        body: JSON.stringify({ resource: "chapter", id: chapterId, action: "release", tabId }),
      }).catch(() => {});
    };
  }, [canEdit, chapterId, tabId]);

  return { mine, lockedBy };
}

// ===== Component ==============================================================
// - Ctrl/Cmd+S триггерит сохранение
// - Кнопка показывает лоадер
// - Поля заблокированы, если soft-lock удерживается другим
export default function ChapterEditorClient({
  chapterId,
  canEdit,
  defaultTitle,
  defaultContent,
  onSave,
}: Props) {
  // --- soft-lock state --------------------------------------------------------
  const { mine, lockedBy } = useChapterLockClient(chapterId, canEdit);
  const disabled = canEdit ? (!mine && !!lockedBy) : true;

  // --- local form state + transition -----------------------------------------
  const [title, setTitle] = useState(defaultTitle);
  const [content, setContent] = useState(defaultContent);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // --- hotkey: Cmd/Ctrl + S ---------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (disabled || pending) return;
        const fd = new FormData();
        fd.set("title", title);
        fd.set("content", content);
        startTransition(async () => {
          await onSave(fd);
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disabled, pending, title, content, onSave]);

  // --- render -----------------------------------------------------------------
  return (
    <form
      ref={formRef}
      action={async (fd: FormData) => {
        // На случай, если поля uncontrolled — гарантируем актуальные значения
        fd.set("title", title);
        fd.set("content", content);
        startTransition(async () => {
          await onSave(fd);
        });
      }}
      className="border border-neutral-800 rounded-xl p-4 space-y-2"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Edit chapter</h2>
        <div className="text-xs opacity-60">{pending ? "Saving…" : "Cmd/Ctrl+S"}</div>
      </div>

      {/* --- fields ------------------------------------------------------------ */}
      <input
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded bg-transparent border border-neutral-700 px-3 py-2"
        required
        disabled={disabled}
        placeholder="Title"
      />

      <textarea
        name="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full rounded bg-transparent border border-neutral-700 px-3 py-2"
        rows={8}
        required
        disabled={disabled}
        placeholder="Markdown content…"
      />

      {/* --- actions ----------------------------------------------------------- */}
      <div className="flex items-center gap-3">
        <button
          id="save-btn"
          className="rounded bg-white text-black px-4 py-2 disabled:opacity-50"
          disabled={disabled || pending}
        >
          {pending ? "Saving…" : "Save changes"}
        </button>

        {/* soft-lock hint */}
        {disabled && lockedBy && (
          <span className="text-xs opacity-70">
            Locked by @{lockedBy.username ?? lockedBy.userId}
          </span>
        )}
      </div>

      <p className="opacity-60 text-xs">Only owner or chapter author can edit.</p>
    </form>
  );
}
