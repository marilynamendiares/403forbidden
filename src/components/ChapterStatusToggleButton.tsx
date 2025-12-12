// src/components/ChapterStatusToggleButton.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Props = {
  canToggle: boolean;
  bookSlug: string;
  chapterId: string;
  status: "OPEN" | "CLOSED";
};

export function ChapterStatusToggleButton({
  canToggle,
  bookSlug,
  chapterId,
  status,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const isClosed = status === "CLOSED";
  const nextAction = isClosed ? "open" : "close";
  const label = isClosed ? "Re-open chapter" : "Complete chapter";

  const disabled = !canToggle || isPending;

  const handleClick = () => {
    if (disabled) return;

    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/books/${encodeURIComponent(
            bookSlug
          )}/chapters/${encodeURIComponent(chapterId)}/${nextAction}`,
          {
            method: "POST",
          }
        );

        if (!res.ok) {
          const data = await res
            .json()
            .catch(() => ({ error: "Failed to toggle chapter status" }));
          setError(data.error ?? "Failed to toggle chapter status");
        } else {
          // Обновляем страницу главы (SSR-данные подтянутся заново)
          router.refresh();
        }
      } catch (e) {
        console.error(e);
        setError("Network error while toggling chapter status");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title={
          canToggle
            ? label
            : "Only the book owner or editor can change chapter status"
        }
        className={[
          "rounded-xl border px-3 py-2 text-sm transition",
          isClosed
            ? "border-emerald-500/60 hover:bg-emerald-50/10"
            : "border-red-500/60 hover:bg-red-50/10",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        {isPending ? "…" : label}
      </button>
      {error && (
        <span className="text-xs text-red-400 max-w-xs text-right">{error}</span>
      )}
    </div>
  );
}
