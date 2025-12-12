"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";

export function BookActionsMenu({
  canDelete,
  deleteAction,
}: {
  canDelete: boolean;
  deleteAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  if (!canDelete) return null;

  // Закрывать меню при клике вне блока
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
      {/* Троеточие — теперь использует глобальный стиль */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="book-actions-menu-trigger"
        aria-label="Book actions"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-md border border-neutral-700
                     bg-neutral-900 shadow-lg py-1 text-sm animate-in fade-in zoom-in-95"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              deleteAction();
            }}
            className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-red-400"
          >
            Delete book
          </button>
        </div>
      )}
    </div>
  );
}
