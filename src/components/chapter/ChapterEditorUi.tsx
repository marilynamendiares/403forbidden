"use client";

import { WriterStatusNotice } from "@/components/writer/WriterStatusNotice";

export function ChapterEditorStatusBar({
  isPreview,
  words,
  chars,
  minutes,
  draftRestored,
  statusLabel,
  saveError,
  onDiscardDraft,
  onTogglePreview,
}: {
  isPreview: boolean;
  words: number;
  chars: number;
  minutes: number;
  draftRestored: boolean;
  statusLabel: string;
  saveError: string | null;
  onDiscardDraft: () => void;
  onTogglePreview: () => void;
}) {
  return (
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
          {words} words · {chars} chars
          {minutes > 0 ? <> · ~ {minutes} min read</> : null}
        </div>

        {draftRestored ? (
          <div className="mt-1 inline-flex items-center gap-2 text-xs">
            <span className="text-amber-300">Local draft restored</span>
            <button
              type="button"
              onClick={onDiscardDraft}
              className="rounded-full border border-amber-500/60 px-2.5 py-0.5 text-[11px] text-amber-100 hover:bg-amber-500/10"
            >
              Discard draft
            </button>
          </div>
        ) : null}

        <div className="mt-1 text-xs text-neutral-500">{statusLabel}</div>
        <div className="mt-2">
          <WriterStatusNotice message={saveError} />
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <button
          type="button"
          onClick={onTogglePreview}
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
  );
}

export function ChapterMarkdownToolbar({
  onBold,
  onItalic,
  onInlineCode,
  onCodeBlock,
  onHeading,
  onQuote,
  onDivider,
  onLink,
}: {
  onBold: () => void;
  onItalic: () => void;
  onInlineCode: () => void;
  onCodeBlock: () => void;
  onHeading: () => void;
  onQuote: () => void;
  onDivider: () => void;
  onLink: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-800/80 bg-neutral-950/80 px-2 py-1 text-xs">
      <button type="button" onClick={onBold} className="rounded px-2 py-1 hover:bg-neutral-800">
        <span className="font-semibold">B</span>
      </button>
      <button type="button" onClick={onItalic} className="rounded px-2 py-1 italic hover:bg-neutral-800">
        I
      </button>
      <button
        type="button"
        onClick={onInlineCode}
        className="rounded px-2 py-1 font-mono text-[11px] hover:bg-neutral-800"
      >
        `code`
      </button>
      <button
        type="button"
        onClick={onCodeBlock}
        className="rounded px-2 py-1 font-mono text-[11px] hover:bg-neutral-800"
      >
        code block
      </button>
      <span className="mx-1 h-4 w-px bg-neutral-800" />
      <button type="button" onClick={onHeading} className="rounded px-2 py-1 hover:bg-neutral-800">
        H2
      </button>
      <button type="button" onClick={onQuote} className="rounded px-2 py-1 hover:bg-neutral-800">
        &gt; quote
      </button>
      <button type="button" onClick={onDivider} className="rounded px-2 py-1 hover:bg-neutral-800">
        ---
      </button>
      <button type="button" onClick={onLink} className="rounded px-2 py-1 hover:bg-neutral-800">
        link
      </button>
    </div>
  );
}
