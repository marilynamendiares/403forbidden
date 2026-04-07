"use client";

export function ChapterStatusActions({
  canManageChapter,
  canToggle,
  isDraft,
  isClosed,
  canAffordReopen,
  reopenCost,
  onPublish,
  onToggle,
}: {
  canManageChapter: boolean;
  canToggle: boolean;
  isDraft: boolean;
  isClosed: boolean;
  canAffordReopen: boolean;
  reopenCost: number;
  onPublish: () => void;
  onToggle: () => void;
}) {
  if (!canManageChapter) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-4">
      {isDraft ? (
        <form action={onPublish}>
          <button
            type="submit"
            className="inline-flex items-center rounded-md border border-neutral-700 px-4 py-2 text-sm text-[#2D2D2D] transition hover:bg-[#2D2D2D]/5"
          >
            Publish chapter
          </button>
        </form>
      ) : null}

      {canToggle && !isDraft ? (
        <form action={onToggle}>
          <button
            type="submit"
            disabled={isClosed && !canAffordReopen}
            title={
              isClosed && !canAffordReopen
                ? `Not enough funds (need ${reopenCost} €$)`
                : undefined
            }
            className={[
              "inline-flex items-center gap-3 rounded-md border border-neutral-700 px-4 py-2 text-sm text-[#2D2D2D] transition",
              isClosed && !canAffordReopen
                ? "cursor-not-allowed opacity-40"
                : "hover:bg-[#2D2D2D]/5",
            ].join(" ")}
          >
            <span>{isClosed ? "Re-open chapter" : "Complete chapter"}</span>
            {isClosed ? (
              <span className="header-font-archimoto text-[15px] font-thin leading-none text-[#666666]">
                -{reopenCost} €$
              </span>
            ) : null}
          </button>
        </form>
      ) : null}
    </div>
  );
}
