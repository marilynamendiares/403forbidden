// src/app/characters/page.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCharacterApplications,
  type CharacterApplicationListItem,
} from "@/hooks/useCharacterApplications";
import { createCharacterApplication } from "@/lib/characterApplicationClient";
import type { CharacterApplicationStatus } from "@/lib/characterApplication";

function formatDt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function statusBadge(s: CharacterApplicationStatus) {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide";
  switch (s) {
    case "DRAFT":
      return <span className={`${base} border-neutral-700 text-neutral-300`}>Draft</span>;
    case "SUBMITTED":
      return <span className={`${base} border-sky-700/60 text-sky-200`}>Submitted</span>;
    case "UNDER_REVIEW":
      return <span className={`${base} border-amber-700/60 text-amber-200`}>Under review</span>;
    case "NEEDS_CHANGES":
      return <span className={`${base} border-rose-700/60 text-rose-200`}>Needs changes</span>;
    case "APPROVED":
    default:
      return <span className={`${base} border-emerald-700/60 text-emerald-200`}>Approved</span>;
  }
}

export default function CharactersListPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-10 text-sm opacity-70">Loading…</div>}>
      <CharactersListPageInner />
    </Suspense>
  );
}

function CharactersListPageInner() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const sp = useSearchParams();
  const required = sp.get("required") === "1";
  const {
    items,
    errorMessage,
    isLoading: loadingList,
    refresh,
  } = useCharacterApplications();


  const canCreate = useMemo(() => name.trim().length >= 2, [name]);

  async function create() {
    if (!canCreate || isPending) return;
    setError("");

    startTransition(async () => {
      try {
        const id = await createCharacterApplication(name.trim());
        if (id) {
          router.push(`/characters/${id}`);
        } else {
          await refresh();
          setName("");
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to create");
        return;
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Character Applications</h1>
          <p className="text-sm opacity-70">
            Create your character анкета, submit it for review, receive notes, update, resubmit.
          </p>
        </div>
      </div>

      {required && (
  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
    <div className="font-medium">Access restricted</div>
    <div className="opacity-90 mt-1">
      To access the full forum, submit your character application and wait for approval.
    </div>
  </div>
)}


      {/* Create */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950/30 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-xs opacity-70 mb-1">Character name</label>
            <input
              className="w-full rounded-md border border-neutral-800 bg-transparent px-3 py-2 text-sm"
              placeholder="e.g. Marilyn Amendiares"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
          </div>
          <button
            type="button"
            onClick={create}
            disabled={!canCreate || isPending}
            className="rounded-md border border-neutral-800 px-4 py-2 text-sm hover:bg-neutral-900 disabled:opacity-50"
          >
            {isPending ? "Creating…" : "Create"}
          </button>
        </div>
        {(error || errorMessage) && (
          <p className="mt-2 text-sm text-rose-400">{error || errorMessage}</p>
        )}
      </div>

      {/* List */}
      <div className="space-y-2">
        {loadingList ? (
          <p className="text-sm opacity-70">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm opacity-70">No applications yet.</p>
        ) : (
          <div className="divide-y divide-neutral-900 rounded-xl border border-neutral-900">
            {items.map((it: CharacterApplicationListItem) => {
              const showNote = it.status === "NEEDS_CHANGES" && !!it.moderatorNote?.trim();
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => router.push(`/characters/${it.id}`)}
                  className="w-full text-left px-4 py-3 hover:bg-neutral-950/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{it.name}</div>
                      <div className="text-xs opacity-70 mt-0.5">
                        Updated: {formatDt(it.updatedAt)}
                        {it.lastSubmittedAt ? ` · Submitted: ${formatDt(it.lastSubmittedAt)}` : ""}
                      </div>

                      {it.status === "UNDER_REVIEW" && (
                        <div className="mt-2 text-xs opacity-60">Locked while in review.</div>
                      )}

                      {showNote && (
                        <div className="mt-2 rounded-md border border-rose-700/40 bg-rose-950/30 px-3 py-2">
                          <div className="text-[10px] uppercase tracking-wide text-rose-200/80">
                            Moderator note
                          </div>
                          <div className="text-sm text-rose-100 whitespace-pre-wrap">
                            {it.moderatorNote}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 pt-0.5">{statusBadge(it.status)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
