"use client";

import { useState, useRef } from "react";
import { MoreHorizontal } from "lucide-react";
import { useClickOutside } from "@/hooks/useClickOutside";

export function ChapterActionsMenu({
  canToggle,
  canEdit,
  isDraft,
  status,

  // economy / reopen
  reopenCost,
  canAffordReopen,

  toggleAction,
  publishAction,
  deleteAction,
}: {
  canToggle: boolean;
  canEdit: boolean;
  isDraft: boolean;
  status: "OPEN" | "CLOSED";

  reopenCost: number;
  canAffordReopen: boolean;

  toggleAction: () => Promise<void>;
  publishAction: () => Promise<void>;
  deleteAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useClickOutside(ref, open, () => setOpen(false));

  if (!canEdit) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Chapter actions"
        onClick={() => setOpen((v) => !v)}
        className="entity-actions-menu-trigger"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-md border border-neutral-700 
                     bg-neutral-900 shadow-lg py-1 text-sm animate-in fade-in zoom-in-95"
        >
          {/* PUBLISH CHAPTER (only for drafts) */}
          {isDraft && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                publishAction();
              }}
              className="w-full text-left px-3 py-2 hover:bg-neutral-800"
            >
              Publish chapter
            </button>
          )}

          {/* COMPLETE / RE-OPEN CHAPTER */}
{canToggle && (
  <button
    type="button"
    disabled={
      isDraft ||
      (status === "CLOSED" && !canAffordReopen)
    }
    title={
      isDraft
        ? "Publish the chapter first"
        : status === "CLOSED" && !canAffordReopen
        ? `Not enough funds (need ${reopenCost} €$)`
        : undefined
    }
    onClick={() => {
      if (
        isDraft ||
        (status === "CLOSED" && !canAffordReopen)
      ) {
        return;
      }
      setOpen(false);
      toggleAction();
    }}
    className={[
      "w-full text-left px-3 py-2 flex items-center justify-between gap-2",
      isDraft || (status === "CLOSED" && !canAffordReopen)
        ? "opacity-40 cursor-not-allowed"
        : "hover:bg-neutral-800",
    ].join(" ")}
  >
    <span>
      {status === "OPEN" ? "Complete chapter" : "Re-open chapter"}
    </span>

    {status === "CLOSED" && (
      <span className="text-xs text-neutral-400">
        –{reopenCost} €$
      </span>
    )}
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
