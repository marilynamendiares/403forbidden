"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { RichPostEditor } from "@/components/editor/RichPostEditor";
import { useStableEvent } from "@/hooks/useStableEvent";
import { clearDraft, readDraft, writeDraft } from "@/lib/draftStorage";
import { WriterStatusNotice } from "@/components/writer/WriterStatusNotice";
import { getWriterSaveErrorMessage, getWriterStatusLabel } from "@/lib/writerStatus";

type Props = {
  arcId: string;
  canEdit: boolean;
  defaultContent: string;
  onSave: (formData: FormData) => Promise<void> | void;
};

export function ArcIntroClient({ arcId, canEdit, defaultContent, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(defaultContent);
  const [isPending, startTransition] = useTransition();
  const baseline = useMemo(() => ({ content: defaultContent }), [defaultContent]);
  const dirty = content !== baseline.content;
  const draftKey = useMemo(() => (arcId ? `arc_intro:${arcId}` : ""), [arcId]);
  const [draftRestored, setDraftRestored] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setContent(defaultContent);
  }, [defaultContent]);

  useEffect(() => {
    if (!draftKey) return;
    const parsed = readDraft<{ content?: string }>(draftKey);
    if (!parsed || typeof parsed.content !== "string") return;
    if (!parsed.content.trim() || parsed.content === baseline.content) {
      clearDraft(draftKey);
      return;
    }
    setContent(parsed.content);
    setDraftRestored(true);
    setSaveError(null);
  }, [draftKey, baseline.content]);

  useEffect(() => {
    if (!draftKey) return;
    if (!dirty) {
      clearDraft(draftKey);
      setSaveState("idle");
      return;
    }

    setSaveState("saving");

    const timeout = window.setTimeout(() => {
      if (!content.trim() || content === baseline.content) {
        clearDraft(draftKey);
        setSaveState("idle");
        return;
      }
      if (writeDraft(draftKey, { content })) {
        setSaveState("saved");
      }
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [content, draftKey, dirty, baseline.content]);

  function discardLocalDraft() {
    if (!draftKey) return;
    clearDraft(draftKey);
    setContent(baseline.content);
    setDraftRestored(false);
    setSaveState("idle");
    setSaveError(null);
  }

  const hasDraftState = draftRestored || dirty || saveState === "saving" || saveState === "saved";
  const statusLabel = getWriterStatusLabel({
    draftRestored,
    hasDraftState,
    saveState,
    dirty,
  });

  useEffect(() => {
    if (!dirty) {
      setSaveError(null);
    }
  }, [dirty]);

  const saveCurrentIntro = useStableEvent(async () => {
    if (!canEdit || isPending) return;
    const fd = new FormData();
    fd.set("content", content);

    await onSave(fd);
    setSaveError(null);
    setEditing(false);
  });

  const handleSave = useStableEvent(() => {
    startTransition(async () => {
      try {
        await saveCurrentIntro();
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Failed to save arc intro.";
        setSaveError(getWriterSaveErrorMessage(message, "arc intro"));
      }
    });
  });

  async function handleCancel() {
    if (isPending) return;
    setEditing(false);
    discardLocalDraft();
  }

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, handleSave]);

  if (!editing) {
    const publishedContent = baseline.content;

    return (
      <section className="space-y-4 text-[#2D2D2D]">
        {publishedContent ? (
          <div className="post-body max-w-none" dangerouslySetInnerHTML={{ __html: publishedContent }} />
        ) : (
          <p className="text-sm opacity-60">
            No arc intro yet. Click &quot;Edit intro&quot; to add a synopsis or author note.
          </p>
        )}

        {canEdit && (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setEditing(true);
              }}
              className="rounded-md border border-[#2D2D2D]/40 px-4 py-2 text-sm hover:bg-[#2D2D2D]/5"
            >
              Edit intro
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="mt-4 space-y-3 text-[#2D2D2D]">
      <WriterStatusNotice message={saveError} tone="muted" />
      <div className="flex flex-col gap-1 text-xs">
        <span className="header-font-archimoto uppercase tracking-wide text-[#2D2D2D]/55">
          EDITING ARC INTRO
        </span>
      </div>

      <div className="post-body max-w-none">
        <RichPostEditor
          value={content}
          onChange={setContent}
          disabled={!canEdit || isPending}
          tone="light"
        />
      </div>

      <div className="flex items-center justify-between gap-4 pt-1 text-xs">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || isPending || !canEdit}
            className="hover:opacity-70 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={handleCancel} disabled={isPending} className="hover:opacity-70 disabled:opacity-50">
            Cancel
          </button>
        </div>
        <div className="flex items-center gap-3 text-neutral-500">
          <span>{statusLabel}</span>
          {hasDraftState && (
            <button
              type="button"
              onClick={discardLocalDraft}
              disabled={isPending}
              className="hover:text-[#2D2D2D] disabled:opacity-50"
            >
              reset
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
