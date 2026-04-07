"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import AdminSectionCard from "@/components/admin/AdminSectionCard";
import {
  useAdminCharacterApplications,
  type AdminCharacterApplicationRow,
} from "@/hooks/useCharacterApplications";
import type { CharacterApplicationStatus } from "@/lib/characterApplication";

function badgeClass(status: CharacterApplicationStatus) {
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
  const { items, groups, errorMessage, isLoading } = useAdminCharacterApplications();

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

  function Card({ r }: { r: AdminCharacterApplicationRow }) {
    const display = r.user.profile?.displayName ?? r.user.username ?? r.user.email;

    return (
      <button
        type="button"
        onClick={() => router.push(`/admin/characters/${r.id}`)}
        className="w-full rounded-xl border border-neutral-900 bg-neutral-950/40 px-4 py-3 text-left transition hover:border-neutral-800 hover:bg-neutral-950/60"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm opacity-70">{display}</div>
            <div className="mt-1 text-lg font-semibold">{r.name}</div>

            <div className="mt-1 text-xs opacity-60">
              updated {fmt(r.updatedAt)}
              {r.lastSubmittedAt ? ` · submitted ${fmt(r.lastSubmittedAt)}` : ""}
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
    <>
      {errorMessage && <div className="text-sm text-rose-400">{errorMessage}</div>}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminSectionCard
          eyebrow="Active Queue"
          title="In Review"
          subtitle="Submitted and under-review applications waiting for operator action."
          contentClassName="space-y-3"
        >
          {isLoading ? (
            <div className="text-sm opacity-60">Loading…</div>
          ) : submitted.length === 0 ? (
            <div className="text-sm opacity-60">No submitted applications.</div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {submitted.map((r) => (
                <Card key={r.id} r={r} />
              ))}
            </div>
          )}
        </AdminSectionCard>

        <AdminSectionCard
          eyebrow="Archive"
          title="Other"
          subtitle="Approved drafts and applications not in the active queue."
          contentClassName="space-y-3"
        >
          {isLoading ? (
            <div className="text-sm opacity-60">Loading…</div>
          ) : others.length === 0 ? (
            <div className="text-sm opacity-60">No archived applications.</div>
          ) : (
            <div className="grid gap-3">
              {others.map((r) => (
                <Card key={r.id} r={r} />
              ))}
            </div>
          )}
        </AdminSectionCard>
      </div>
    </>
  );
}
