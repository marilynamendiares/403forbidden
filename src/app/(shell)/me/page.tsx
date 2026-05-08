import Link from "next/link";
import { redirect } from "next/navigation";
import AvatarImg from "@/components/avatarImg";
import { CharacterProfileCard } from "@/components/characters/CharacterProfileCard";
import LockedSurface from "@/components/LockedSurface";
import ProfileArcChronology from "@/components/profile/ProfileArcChronology";
import ShellRightRailSlot from "@/app/shell/ShellRightRailSlot";
import { listCharacterApplicationsForUser } from "@/server/services/characterApplications";
import { getProfileArcChronology } from "@/server/services/profileArcChronology";
import { getApprovedCharacter } from "@/server/player";
import { getMyProfile } from "@/server/services/profileView";
import { getSessionViewer } from "@/server/session";
import type { CharacterApplicationStatus } from "@/lib/characterApplication";

export const runtime = "nodejs";

type CharacterApplicationSummary = {
  id: string;
  name: string;
  status: CharacterApplicationStatus;
  updatedAt: Date;
  lastSubmittedAt: Date | null;
  moderatorNote: string | null;
};

function statusLabel(status: CharacterApplicationStatus) {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "SUBMITTED":
      return "Submitted";
    case "UNDER_REVIEW":
      return "Under review";
    case "NEEDS_CHANGES":
      return "Needs changes";
    case "APPROVED":
      return "Approved";
  }
}

function statusTone(status: CharacterApplicationStatus) {
  switch (status) {
    case "APPROVED":
      return "border-emerald-700/50 bg-emerald-950/20 text-emerald-100";
    case "NEEDS_CHANGES":
      return "border-amber-700/50 bg-amber-950/20 text-amber-100";
    case "SUBMITTED":
    case "UNDER_REVIEW":
      return "border-sky-700/50 bg-sky-950/20 text-sky-100";
    case "DRAFT":
    default:
      return "border-neutral-800 bg-neutral-950/35 text-neutral-200";
  }
}

function pickActiveApplication(items: CharacterApplicationSummary[]) {
  const approved = items.find((item) => item.status === "APPROVED");
  if (approved) return approved;

  const priority: Record<CharacterApplicationStatus, number> = {
    NEEDS_CHANGES: 0,
    SUBMITTED: 1,
    UNDER_REVIEW: 2,
    DRAFT: 3,
    APPROVED: 4,
  };

  return [...items].sort((a, b) => {
    const statusDiff = priority[a.status] - priority[b.status];
    if (statusDiff !== 0) return statusDiff;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  })[0] ?? null;
}

function CharacterGateBanner({
  application,
}: {
  application: CharacterApplicationSummary | null;
}) {
  if (!application) {
    return (
      <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          Character access required
        </div>
        <h2 className="mt-2 text-xl font-semibold text-neutral-100">
          Create your character
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
          Your account is inside the system, but gameplay access unlocks after
          a character application is approved.
        </p>
        <div className="mt-4">
          <Link
            href="/characters"
            className="inline-flex rounded-md border border-neutral-700 px-3 py-2 text-sm hover:border-neutral-500 hover:bg-neutral-900"
          >
            Start character application
          </Link>
        </div>
      </section>
    );
  }

  if (application.status === "APPROVED") return null;

  const actionLabel =
    application.status === "NEEDS_CHANGES"
      ? "Review requested edits"
      : application.status === "DRAFT"
        ? "Continue application"
        : "Open application";

  return (
    <section className={`rounded-xl border p-5 ${statusTone(application.status)}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] opacity-70">
        Character application
      </div>
      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold">{application.name}</h2>
            <span className="rounded-full border border-current/30 px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] opacity-80">
              {statusLabel(application.status)}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 opacity-75">
            {application.status === "NEEDS_CHANGES"
              ? "Moderation returned notes. Update the dossier and submit it again when ready."
              : application.status === "DRAFT"
                ? "Finish the dossier and submit it for review to unlock full player access."
                : "The dossier is in the review queue. Full player access unlocks after approval."}
          </p>
          {application.moderatorNote ? (
            <div className="mt-3 rounded-md border border-current/20 bg-black/20 px-3 py-2 text-sm">
              <div className="text-[10px] uppercase tracking-[0.16em] opacity-60">
                Moderator note
              </div>
              <div className="mt-1 whitespace-pre-wrap opacity-85">
                {application.moderatorNote}
              </div>
            </div>
          ) : null}
        </div>
        <Link
          href={`/characters/${application.id}`}
          className="inline-flex w-fit rounded-md border border-current/30 px-3 py-2 text-sm hover:bg-black/15"
        >
          {actionLabel}
        </Link>
      </div>
    </section>
  );
}

export default async function MePage() {
  const { userId } = await getSessionViewer();
  if (!userId) redirect("/login?next=/me");

  const [profile, applications, approvedCharacter, chronology] = await Promise.all([
    getMyProfile(userId),
    listCharacterApplicationsForUser(userId),
    getApprovedCharacter(userId),
    getProfileArcChronology({ userId, publicOnly: false }),
  ]);

  const activeApplication = pickActiveApplication(
    applications as CharacterApplicationSummary[]
  );
  const isApproved = activeApplication?.status === "APPROVED";

  return (
    <div className="space-y-6 pb-8">
      <ShellRightRailSlot>
        {approvedCharacter ? (
          <CharacterProfileCard
            character={approvedCharacter}
            dossierHref={`/characters/${approvedCharacter.id}`}
          />
        ) : (
          <LockedSurface
            eyebrow="Character access"
            title="Create your character"
            description="Your profile is active, but gameplay identity opens after an approved character dossier."
            actionHref="/characters"
            actionLabel="Open character center"
          />
        )}
      </ShellRightRailSlot>

      <section className="grid gap-6 rounded-xl border border-neutral-800 bg-neutral-950/30 p-5 md:grid-cols-[120px_1fr_auto] md:items-center">
        <div className="h-28 w-28 overflow-hidden rounded-xl bg-neutral-900">
          <AvatarImg
            src={profile.avatarUrl ?? undefined}
            alt={`${profile.displayName} avatar`}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            My profile
          </div>
          <h1 className="mt-2 truncate text-3xl font-semibold text-neutral-100">
            {profile.displayName}
          </h1>
          <p className="mt-1 text-lg text-neutral-400">@{profile.username}</p>
          {profile.bio ? (
            <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-neutral-400">
              {profile.bio}
            </p>
          ) : (
            <p className="mt-3 text-sm text-neutral-500">
              No bio yet. Add one in profile settings.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 md:flex-col md:items-end">
          <Link
            href="/profile/settings"
            className="rounded-md border border-neutral-700 px-3 py-2 text-sm hover:border-neutral-500 hover:bg-neutral-900"
          >
            Edit profile
          </Link>
          <Link
            href={`/u/${encodeURIComponent(profile.username)}`}
            className="rounded-md border border-neutral-800 px-3 py-2 text-sm text-neutral-300 hover:border-neutral-600 hover:bg-neutral-900"
          >
            Public route
          </Link>
        </div>
      </section>

      {!isApproved ? <CharacterGateBanner application={activeApplication} /> : null}

      <section className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/30 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            Wallet
          </div>
          <div className="mt-3 text-2xl font-semibold text-neutral-100">
            <span className="font-mono text-emerald-400">€$</span>{" "}
            <span className="tabular-nums">{profile.eurodollars}</span>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/30 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            Access
          </div>
          <div className="mt-3 text-2xl font-semibold text-neutral-100">
            {isApproved ? "Player" : "Restricted"}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ProfileArcChronology
          items={chronology}
          isLocked={!isApproved}
          emptyTitle="No arcs yet"
          emptyDescription="Created arcs and arcs where you post will appear here by latest activity."
        />

        {isApproved ? (
          <section className="rounded-xl border border-neutral-800 bg-neutral-950/30 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
              Profile systems
            </div>
            <h2 className="mt-2 text-lg font-semibold text-neutral-100">
              Identity layer active
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              Inventory, cosmetics and shop systems are available for this
              player profile as those modules mature.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/u/${encodeURIComponent(profile.username)}/inventory`}
                className="rounded-md border border-neutral-700 px-3 py-2 text-sm hover:border-neutral-500 hover:bg-neutral-900"
              >
                Inventory
              </Link>
              <Link
                href="/world/shop"
                className="rounded-md border border-neutral-800 px-3 py-2 text-sm text-neutral-300 hover:border-neutral-600 hover:bg-neutral-900"
              >
                Shop
              </Link>
            </div>
          </section>
        ) : (
          <LockedSurface
            title="Shop and appearance"
            description="Full profile customization, inventory and purchases are reserved for approved characters."
            actionHref="/characters"
            actionLabel="Create character"
          />
        )}
      </section>
    </div>
  );
}
