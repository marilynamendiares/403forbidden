"use client";

export function ChapterIntroViewActions({
  canEdit,
  onEdit,
}: {
  canEdit: boolean;
  onEdit: () => void | Promise<void>;
}) {
  if (!canEdit) return null;

  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        type="button"
        onClick={() => {
          void onEdit();
        }}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Edit
      </button>
    </div>
  );
}

export function ChapterIntroDraftActions({
  statusLabel,
  hasDraftState,
  onDiscardDraft,
  disabled,
}: {
  statusLabel: string;
  hasDraftState: boolean;
  onDiscardDraft: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-[11px] text-right text-neutral-500">
      <span>{statusLabel}</span>
      {hasDraftState ? (
        <button
          type="button"
          onClick={onDiscardDraft}
          disabled={disabled}
          className="hover:text-foreground disabled:opacity-50"
        >
          reset
        </button>
      ) : null}
    </div>
  );
}
