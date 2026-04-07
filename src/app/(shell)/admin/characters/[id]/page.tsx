"use client";

import { use, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AdminSectionCard from "@/components/admin/AdminSectionCard";
import {
  reviewCharacterApplication,
} from "@/lib/characterApplicationClient";
import { useAdminCharacterApplicationItem } from "@/hooks/useCharacterApplicationItem";
import { CharacterApplicationReadonlyDetails } from "@/components/characters/CharacterApplicationUi";

type Props = { params: Promise<{ id: string }> };

export default function AdminCharacterReviewPage({ params }: Props) {
  const router = useRouter();
  const { id } = use(params);
  const { item, errorMessage, isLoading, refresh } = useAdminCharacterApplicationItem(id);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!item) return;
    setNote(item.moderatorNote ?? "");
  }, [item]);

  const displayUser = useMemo(() => {
    if (!item) return "";
    return item.user.profile?.displayName ?? item.user.username ?? item.user.email;
  }, [item]);

  async function act(action: "APPROVE" | "NEEDS_CHANGES") {
    if (!item || isPending) return;
    setError("");
    setHint("");

    startTransition(async () => {
      try {
        await reviewCharacterApplication(id, {
          action,
          note: note.trim() || undefined,
        });
        setHint(action === "APPROVE" ? "Approved." : "Sent back (needs changes).");
        await refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Action failed");
        return;
      }
    });
  }

  return (
    <>
      <div>
        <button
          type="button"
          onClick={() => router.push("/admin/characters")}
          className="text-sm opacity-70 hover:opacity-100"
        >
          ← Back to queue
        </button>
      </div>

      {error && <div className="text-sm text-rose-400">{error}</div>}
      {errorMessage && !error ? <div className="text-sm text-rose-400">{errorMessage}</div> : null}

      {!item ? (
        <div className="text-sm opacity-60">{isLoading ? "Loading…" : "Application not found."}</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
          <div className="space-y-4">
            <AdminSectionCard
              eyebrow="Applicant"
              title={item.name}
              subtitle="Read the submission details below before moving the application forward."
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-neutral-900 bg-neutral-950/35 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Player</div>
                  <div className="mt-2 text-sm text-neutral-200">{displayUser}</div>
                </div>
                <div className="rounded-xl border border-neutral-900 bg-neutral-950/35 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Status</div>
                  <div className="mt-2 text-sm text-neutral-200">{item.status}</div>
                </div>
                <div className="rounded-xl border border-neutral-900 bg-neutral-950/35 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Updated</div>
                  <div className="mt-2 text-sm text-neutral-200">{new Date(item.updatedAt).toLocaleString()}</div>
                </div>
                <div className="rounded-xl border border-neutral-900 bg-neutral-950/35 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Submitted</div>
                  <div className="mt-2 text-sm text-neutral-200">
                    {item.lastSubmittedAt ? new Date(item.lastSubmittedAt).toLocaleString() : "Draft only"}
                  </div>
                </div>
              </div>
            </AdminSectionCard>

            <AdminSectionCard title="Application Review" subtitle="Full readonly application details.">
              <CharacterApplicationReadonlyDetails name={item.name} form={item.form} />
            </AdminSectionCard>
          </div>

          <div className="space-y-4 xl:sticky xl:top-6">
            <AdminSectionCard
              eyebrow="Action Rail"
              title="Operator Actions"
              subtitle="Leave a note or move the application to its next state."
            >
              <div className="space-y-2">
                <div className="text-xs opacity-60">Moderator note (optional)</div>
                <textarea
                  className="min-h-[160px] w-full rounded-lg border border-neutral-800 bg-transparent px-3 py-2 text-sm"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={isPending}
                />
              </div>

              <div className="mt-4 grid gap-3">
                <button
                  type="button"
                  onClick={() => act("APPROVE")}
                  disabled={isPending}
                  className="w-full rounded-lg border border-neutral-800 px-4 py-2.5 text-sm hover:bg-neutral-900 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => act("NEEDS_CHANGES")}
                  disabled={isPending}
                  className="w-full rounded-lg border border-neutral-800 px-4 py-2.5 text-sm hover:bg-neutral-900 disabled:opacity-50"
                >
                  Needs changes
                </button>
              </div>

              <div className="mt-4 text-xs">
                {hint ? <span className="text-emerald-300">{hint}</span> : null}
              </div>
            </AdminSectionCard>

            <AdminSectionCard
              eyebrow="Decision Guide"
              title="Review Heuristic"
              subtitle="Quick operator checklist to keep review decisions consistent."
            >
              <ul className="space-y-2 text-sm leading-6 text-neutral-400">
                <li>Approve when the concept is clear, usable, and safe for onboarding into the game.</li>
                <li>Use needs changes when the character is promising but missing clarity or required edits.</li>
                <li>Keep the moderator note short, concrete, and helpful for the next action.</li>
              </ul>
            </AdminSectionCard>
          </div>
        </div>
      )}
    </>
  );
}
