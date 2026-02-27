"use client";

import { use, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type CharacterForm = {
  age?: number | null;
  gender?: string;
  occupation?: string;
  appearance?: string;
  personality?: string;
  background?: string;
};

type Item = {
  id: string;
  name: string;
  form: CharacterForm;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "NEEDS_CHANGES" | "APPROVED";
  updatedAt: string;
  lastSubmittedAt: string | null;
  moderatorNote: string | null;
  user: {
    id: string;
    email: string;
    username: string;
    profile: { displayName: string; avatarUrl: string | null } | null;
  };
};


type Props = { params: Promise<{ id: string }> };

export default function AdminCharacterReviewPage({ params }: Props) {
  const router = useRouter();
  const { id } = use(params);

  const [item, setItem] = useState<Item | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");

  const [isPending, startTransition] = useTransition();

  async function load() {
    setError("");
    const res = await fetch(`/api/admin/characters/${id}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data?.error ?? "Failed to load");
      setItem(null);
      return;
    }

    const it = data?.item as Item;
    setItem(it);
    setNote(it?.moderatorNote ?? "");
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

const displayUser = useMemo(() => {
  if (!item) return "";
  return item.user.profile?.displayName ?? item.user.username ?? item.user.email;
}, [item]);

  async function act(action: "APPROVE" | "NEEDS_CHANGES") {
    if (!item || isPending) return;
    setError("");
    setHint("");

    startTransition(async () => {
      const res = await fetch(`/api/admin/characters/${id}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Action failed");
        return;
      }
      setHint(action === "APPROVE" ? "Approved." : "Sent back (needs changes).");
      await load();
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => router.push("/admin/characters")}
            className="text-sm opacity-70 hover:opacity-100"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-semibold mt-2">Review Application</h1>
          {item && (
            <p className="text-sm opacity-70">
              {displayUser} • {item.status}
            </p>
          )}
        </div>
      </div>

      {error && <div className="text-sm text-rose-400">{error}</div>}

      {!item ? (
        <div className="text-sm opacity-60">Loading…</div>
      ) : (
        <div className="rounded-xl border border-neutral-900 p-5 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <div className="text-xs opacity-60">Name</div>
              <div className="text-lg font-semibold">{item.name}</div>
            </div>
            <div>
              <div className="text-xs opacity-60">Age</div>
              <div className="text-sm">{item.form?.age ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs opacity-60">Gender</div>
              <div className="text-sm">{item.form?.gender || "—"}</div>
            </div>
            <div className="sm:col-span-3">
              <div className="text-xs opacity-60">Occupation</div>
              <div className="text-sm">{item.form?.occupation || "—"}</div>
            </div>
          </div>

          <div>
            <div className="text-xs opacity-60 mb-1">Appearance</div>
            <div className="whitespace-pre-wrap rounded-md border border-neutral-900 bg-neutral-950/30 p-3 text-sm">
              {item.form?.appearance || "—"}
            </div>
          </div>

          <div>
            <div className="text-xs opacity-60 mb-1">Personality</div>
            <div className="whitespace-pre-wrap rounded-md border border-neutral-900 bg-neutral-950/30 p-3 text-sm">
              {item.form?.personality || "—"}
            </div>
          </div>

          <div>
            <div className="text-xs opacity-60 mb-1">Background</div>
            <div className="whitespace-pre-wrap rounded-md border border-neutral-900 bg-neutral-950/30 p-3 text-sm">
              {item.form?.background || "—"}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs opacity-60">Moderator note (optional)</div>
            <textarea
              className="w-full min-h-[120px] rounded-md border border-neutral-800 bg-transparent px-3 py-2 text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => act("NEEDS_CHANGES")}
                disabled={isPending}
                className="rounded-md border border-neutral-800 px-4 py-2 text-sm hover:bg-neutral-900 disabled:opacity-50"
              >
                Needs changes
              </button>
              <button
                type="button"
                onClick={() => act("APPROVE")}
                disabled={isPending}
                className="rounded-md border border-neutral-800 px-4 py-2 text-sm hover:bg-neutral-900 disabled:opacity-50"
              >
                Approve
              </button>
            </div>

            <div className="text-xs">
              {hint ? <span className="text-emerald-300">{hint}</span> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
