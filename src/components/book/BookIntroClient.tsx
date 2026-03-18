"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import AvatarImg from "@/components/avatarImg";
import { RichPostEditor } from "@/components/editor/RichPostEditor";

type Props = {
  bookId: string;
  canEdit: boolean;
  defaultContent: string;
  onSave: (formData: FormData) => Promise<void> | void;
};

export function BookIntroClient({ bookId, canEdit, defaultContent, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(defaultContent);
  const [isPending, startTransition] = useTransition();
  const [tabId] = useState(() => crypto.randomUUID());
  const [lock, setLock] = useState<
    | { status: "idle" }
    | { status: "mine" }
    | { status: "locked"; lockedBy: { userId: string; username?: string; avatarUrl?: string | null } }
    | { status: "error"; message: string }
  >({ status: "idle" });
  const baseline = useMemo(() => ({ content: defaultContent }), [defaultContent]);
  const dirty = content !== baseline.content;
  const draftKey = useMemo(() => (bookId ? `book_intro:${bookId}` : ""), [bookId]);
  const [draftRestored, setDraftRestored] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  async function lockCall(action: "acquire_or_beat" | "release" | "status") {
    const res = await fetch("/api/lock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resource: "book", id: bookId, action, tabId }),
    });

    const payload = await res.json().catch(() => ({}));

    if (res.status === 423) {
      setLock({
        status: "locked",
        lockedBy: payload.lockedBy ?? { userId: "unknown", username: "someone", avatarUrl: null },
      });
      return false;
    }

    if (!res.ok) {
      setLock({ status: "error", message: payload?.error ?? "lock_failed" });
      return false;
    }

    setLock({ status: "mine" });
    return true;
  }

  useEffect(() => {
    setContent(defaultContent);
  }, [defaultContent]);

  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { content?: string } | null;
      if (!parsed || typeof parsed.content !== "string") return;
      if (!parsed.content.trim() || parsed.content === baseline.content) {
        localStorage.removeItem(draftKey);
        return;
      }
      setContent(parsed.content);
      setDraftRestored(true);
    } catch {
      // ignore
    }
  }, [draftKey, baseline.content]);

  useEffect(() => {
    if (!draftKey) return;
    if (!dirty) {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
      setSaveState("idle");
      setLastSavedAt(null);
      return;
    }

    setSaveState("saving");

    const timeout = window.setTimeout(() => {
      try {
        if (!content.trim() || content === baseline.content) {
          localStorage.removeItem(draftKey);
          setSaveState("idle");
          setLastSavedAt(null);
          return;
        }
        localStorage.setItem(draftKey, JSON.stringify({ content }));
        setSaveState("saved");
        setLastSavedAt(Date.now());
      } catch {
        // ignore
      }
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [content, draftKey, dirty, baseline.content]);

  function discardLocalDraft() {
    if (!draftKey) return;
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    setContent(baseline.content);
    setDraftRestored(false);
    setSaveState("idle");
    setLastSavedAt(null);
  }

  const hasDraftState = draftRestored || dirty || saveState === "saving" || saveState === "saved";
  const statusLabel = draftRestored
    ? "local draft restored"
    : hasDraftState
      ? "draft saved"
      : "no local changes";

  function handleSave() {
    if (!canEdit || isPending) return;
    const fd = new FormData();
    fd.set("content", content);

    startTransition(async () => {
      await onSave(fd);
      await lockCall("release");
      setEditing(false);
    });
  }

  async function handleCancel() {
    if (isPending) return;
    await lockCall("release");
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
    window.addEventListener("keydown", onKey as any);
    return () => window.removeEventListener("keydown", onKey as any);
  }, [editing, content, canEdit, isPending]);

  useEffect(() => {
    if (!editing) return;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      if (lock.status === "locked" || lock.status === "error") return;
      await lockCall("acquire_or_beat");
    };

    tick();
    const interval = window.setInterval(tick, 45_000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [editing, lock.status]);

  useEffect(() => {
    if (editing && lock.status === "locked") setEditing(false);
  }, [editing, lock.status]);

  useEffect(() => {
    return () => {
      fetch("/api/lock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resource: "book", id: bookId, action: "release", tabId }),
      }).catch(() => {});
    };
  }, [bookId, tabId]);

  useEffect(() => {
    if (!bookId || editing) return;
    let cancelled = false;

    const run = async () => {
      const res = await fetch("/api/lock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resource: "book", id: bookId, action: "status", tabId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (payload?.locked) {
        setLock({
          status: "locked",
          lockedBy: payload.lockedBy ?? { userId: "unknown", username: "someone" },
        });
      } else {
        setLock({ status: "idle" });
      }
    };

    run();
    const interval = window.setInterval(run, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [bookId, tabId, editing]);

  if (!editing) {
    const publishedContent = baseline.content;

    return (
      <section className="space-y-4 text-[#2D2D2D]">
        {publishedContent ? (
          <div className="post-body max-w-none" dangerouslySetInnerHTML={{ __html: publishedContent }} />
        ) : (
          <p className="text-sm opacity-60">
            No book intro yet. Click "Edit intro" to add a synopsis or author note.
          </p>
        )}

        {canEdit && (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              disabled={lock.status === "locked"}
              onClick={async () => {
                if (lock.status === "locked") return;
                const ok = await lockCall("acquire_or_beat");
                if (ok) setEditing(true);
              }}
              className="rounded-md border border-[#2D2D2D]/40 px-4 py-2 text-sm hover:bg-[#2D2D2D]/5 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Edit intro
            </button>

            {lock.status === "locked" && (
              <span className="inline-flex items-center gap-2 text-sm text-amber-700">
                <span className="h-8 w-8 overflow-hidden rounded-full border border-amber-700/30">
                  {lock.lockedBy.avatarUrl ? (
                    <AvatarImg
                      src={lock.lockedBy.avatarUrl ?? undefined}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[10px] opacity-80">
                      {(lock.lockedBy.username ?? "U").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </span>
                <span>currently being edited</span>
              </span>
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="mt-4 space-y-3 text-[#2D2D2D]">
      {lock.status === "locked" && (
        <div className="rounded-md border border-amber-700/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
          Book intro is being edited by{" "}
          <span className="font-medium">@{lock.lockedBy.username ?? lock.lockedBy.userId}</span>.
          Try again later.
        </div>
      )}

      <div className="flex flex-col gap-1 text-xs">
        <span className="header-font-archimoto uppercase tracking-wide text-[#2D2D2D]/55">
          EDITING BOOK INTRO
        </span>
      </div>

      <div className="post-body max-w-none">
        <RichPostEditor
          value={content}
          onChange={setContent}
          disabled={!canEdit || isPending || lock.status !== "mine"}
          tone="light"
        />
      </div>

      <div className="flex items-center justify-between gap-4 pt-1 text-xs">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || isPending || !canEdit || lock.status !== "mine"}
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
