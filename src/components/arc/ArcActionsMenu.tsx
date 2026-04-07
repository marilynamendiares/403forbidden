"use client";

import { useState, useRef } from "react";
import { MoreHorizontal } from "lucide-react";
import { useClickOutside } from "@/hooks/useClickOutside";

export function ArcActionsMenu({
  canDelete,
  deleteAction,
}: {
  canDelete: boolean;
  deleteAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useClickOutside(ref, open, () => setOpen(false));

  if (!canDelete) return null;

  return (
    <div className="relative" ref={ref}>
      {/* Троеточие — теперь использует глобальный стиль */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="entity-actions-menu-trigger"
        aria-label="Arc actions"
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
            Delete arc
          </button>
        </div>
      )}
    </div>
  );
}
