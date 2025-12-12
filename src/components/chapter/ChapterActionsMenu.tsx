"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";

export function ChapterActionsMenu({
  canToggle,
  canEdit,
  isDraft,
  bookSlug,
  chapterId,
  status,
  publishAction,
  deleteAction,
}: {
  canToggle: boolean;
  canEdit: boolean;
  isDraft: boolean;
  bookSlug: string;
  chapterId: string;
  status: "OPEN" | "CLOSED";
  publishAction: () => Promise<void>;
  deleteAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  if (!canEdit) return null;

  // закрытие меню по клику вне
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {/* ⬅️ ТРОЕТОЧИЕ: теперь — глобальный стиль */}
      <button
        type="button"
        aria-label="Chapter actions"
        onClick={() => setOpen((v) => !v)}
        className="book-actions-menu-trigger"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-md border border-neutral-700 
                     bg-neutral-900 shadow-lg py-1 text-sm animate-in fade-in zoom-in-95"
        >
          {/* COMPLETE / RE-OPEN CHAPTER */}
          {canToggle && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                publishAction();
              }}
              className="w-full text-left px-3 py-2 hover:bg-neutral-800"
            >
              {status === "OPEN" ? "Complete chapter" : "Re-open chapter"}
            </button>
          )}

          {/* DELETE CHAPTER */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              deleteAction();
            }}
            className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-red-400"
          >
            Delete chapter
          </button>
        </div>
      )}
    </div>
  );
}
