// src/app/characters/page.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Item = {
  id: string;
  name: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "NEEDS_CHANGES" | "APPROVED";
  updatedAt: string;
  createdAt: string;
  lastSubmittedAt: string | null;
  moderatorNote?: string | null; // ✅ чтобы можно было показать note в списке
};

function formatDt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function statusBadge(s: Item["status"]) {
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
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const sp = useSearchParams();
  const required = sp.get("required") === "1";


  const canCreate = useMemo(() => name.trim().length >= 2, [name]);

  async function load() {
    setLoadingList(true);
    setError("");
    const res = await fetch("/api/characters", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error ?? "Failed to load");
      setLoadingList(false);
      return;
    }

    const arr = Array.isArray(data?.items) ? (data.items as Item[]) : [];
    // лёгкая сортировка: нужные статусы чуть выше, но не ломаем updatedAt
    const prio: Record<Item["status"], number> = {
      NEEDS_CHANGES: 0,
      DRAFT: 1,
      SUBMITTED: 2,
      UNDER_REVIEW: 3,
      APPROVED: 4,
    };
    arr.sort((a, b) => {
      const p = prio[a.status] - prio[b.status];
      if (p !== 0) return p;
      return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
    });

    setItems(arr);
    setLoadingList(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!canCreate || isPending) return;
    setError("");

    startTransition(async () => {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Failed to create");
        return;
      }

      const id = data?.id as string | undefined;
      if (id) {
        router.push(`/characters/${id}`);
      } else {
        await load();
        setName("");
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
        {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
      </div>

      {/* List */}
      <div className="space-y-2">
        {loadingList ? (
          <p className="text-sm opacity-70">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm opacity-70">No applications yet.</p>
        ) : (
          <div className="divide-y divide-neutral-900 rounded-xl border border-neutral-900">
            {items.map((it) => {
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
