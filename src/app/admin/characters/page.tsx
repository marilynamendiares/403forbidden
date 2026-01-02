"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  name: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "NEEDS_CHANGES" | "APPROVED";
  updatedAt: string;
  createdAt?: string;
  lastSubmittedAt: string | null;
  moderatorNote?: string | null;
  moderatorId?: string | null;
  user: {
    id: string;
    email: string;
    username: string;
    profile: { displayName: string; avatarUrl: string | null } | null;
  };
};

type ApiPayload = {
  items?: Row[];
  groups?: {
    inReview: Row[];
    other: Row[];
  };
  error?: string;
};

function badgeClass(status: Row["status"]) {
  switch (status) {
    case "APPROVED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "NEEDS_CHANGES":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "SUBMITTED":
    case "UNDER_REVIEW":
      return "border-sky-500/30 bg-sky-500/10 text-sky-200";
    default:
      return "border-neutral-700 bg-neutral-900/30 text-neutral-300";
  }
}

function fmt(dt?: string | null) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

export default function AdminCharactersPage() {
  const router = useRouter();

  const [items, setItems] = useState<Row[]>([]);
  const [groups, setGroups] = useState<{ inReview: Row[]; other: Row[] } | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    const res = await fetch("/api/admin/characters", { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as ApiPayload;

    if (!res.ok) {
      setError(data?.error ?? "Failed to load");
      setItems([]);
      setGroups(null);
      return;
    }

    const list = (data?.items ?? []) as Row[];
    setItems(list);

    if (data?.groups?.inReview && data?.groups?.other) {
      setGroups({ inReview: data.groups.inReview, other: data.groups.other });
    } else {
      setGroups(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // fallback если groups нет (для совместимости)
  const submittedFallback = useMemo(
    () => items.filter((x) => x.status === "SUBMITTED" || x.status === "UNDER_REVIEW"),
    [items]
  );

  const othersFallback = useMemo(
    () => items.filter((x) => !(x.status === "SUBMITTED" || x.status === "UNDER_REVIEW")),
    [items]
  );

  const submitted = groups?.inReview ?? submittedFallback;
  const others = groups?.other ?? othersFallback;

  function Card({ r }: { r: Row }) {
    const display = r.user.profile?.displayName ?? r.user.username ?? r.user.email;

    return (
      <button
        type="button"
        onClick={() => router.push(`/admin/characters/${r.id}`)}
        className="w-full text-left rounded-xl border border-neutral-900 hover:border-neutral-800 bg-neutral-950/40 px-4 py-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm opacity-70">{display}</div>
            <div className="text-lg font-semibold mt-1">{r.name}</div>

            <div className="text-xs opacity-60 mt-1">
              updated {fmt(r.updatedAt)}
              {r.lastSubmittedAt ? ` • submitted ${fmt(r.lastSubmittedAt)}` : ""}
            </div>
          </div>

          <span className={`shrink-0 rounded-full border px-3 py-1 text-xs ${badgeClass(r.status)}`}>
            {r.status}
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Character Applications</h1>
        <p className="text-sm opacity-70">Admin review queue.</p>
      </div>

      {error && <div className="text-sm text-rose-400">{error}</div>}

      <section className="space-y-3">
        <div className="text-xs uppercase tracking-wide opacity-60">In review</div>
        {submitted.length === 0 ? (
          <div className="text-sm opacity-60">No submitted applications.</div>
        ) : (
          <div className="space-y-3">
            {submitted.map((r) => (
              <Card key={r.id} r={r} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="text-xs uppercase tracking-wide opacity-60">Other</div>
        {others.length === 0 ? (
          <div className="text-sm opacity-60">—</div>
        ) : (
          <div className="space-y-3">
            {others.map((r) => (
              <Card key={r.id} r={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
