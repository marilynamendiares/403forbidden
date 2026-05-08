// src/app/u/[username]/page.tsx
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import AvatarImg from "@/components/avatarImg";
import { CharacterProfileCard } from "@/components/characters/CharacterProfileCard";
import ProfileArcChronology from "@/components/profile/ProfileArcChronology";
import ShellRightRailSlot from "@/app/shell/ShellRightRailSlot";
import { getSessionViewer } from "@/server/session";
import {
  getPublicProfilePageByUsername,
  getPublicProfileSeoByUsername,
  PublicProfileHttpError,
} from "@/server/services/publicProfiles";

// для Next 15: params — Promise
type Params = { params: Promise<{ username: string }> };

// SEO заголовок на основе профиля
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;

  const user = await getPublicProfileSeoByUsername(username);

  if (!user) return { title: "Profile not found" };

  const titleName = user.displayName ?? user.username;
  return {
    title: `${titleName} — Profile`,
    description: user.bio ?? `Public profile of ${titleName}`,
    openGraph: {
      title: `${titleName} — Profile`,
      description: user.bio ?? `@${user.username}`,
    },
  };
}

// SSR-страница публичного профиля
export default async function PublicProfilePage({ params }: Params) {
  const { username } = await params;

  const [{ userId: me }, profile] = await Promise.all([
    getSessionViewer(),
    getPublicProfilePageByUsername(username).catch((error) => {
      if (error instanceof PublicProfileHttpError && error.status === 404) {
        return null;
      }
      throw error;
    }),
  ]);

  if (!profile) notFound();

  const isMe = me === profile.user.id;
  if (isMe) redirect("/me");

  return (
    <div className="space-y-6 pb-8">
      <ShellRightRailSlot>
        {profile.approvedCharacter ? (
          <CharacterProfileCard character={profile.approvedCharacter} />
        ) : (
          <section className="rounded-xl border border-neutral-800 bg-neutral-950/35 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
              Character profile
            </div>
            <h2 className="mt-2 text-lg font-semibold text-neutral-100">
              No character submitted
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              This account does not expose an approved character dossier yet.
            </p>
          </section>
        )}
      </ShellRightRailSlot>

      <section className="grid gap-6 rounded-xl border border-neutral-800 bg-neutral-950/30 p-5 md:grid-cols-[120px_1fr_auto] md:items-center">
        <div className="h-28 w-28 overflow-hidden rounded-xl bg-neutral-900">
          <AvatarImg
            src={profile.user.avatarUrl ?? undefined}
            alt={`${profile.user.displayName} avatar`}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            Public profile
          </div>
          <h1 className="mt-2 truncate text-3xl font-semibold text-neutral-100">
            {profile.user.displayName}
          </h1>
          <p className="mt-1 text-lg text-neutral-400">@{profile.user.username}</p>
          {profile.user.bio ? (
            <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-neutral-400">
              {profile.user.bio}
            </p>
          ) : (
            <p className="mt-3 text-sm text-neutral-500">No bio yet.</p>
          )}
        </div>

        <Link
          href={`/u/${encodeURIComponent(profile.user.username)}/inventory`}
          className="inline-flex w-fit rounded-md border border-neutral-700 px-3 py-2 text-sm hover:border-neutral-500 hover:bg-neutral-900 md:justify-self-end"
        >
          Inventory
        </Link>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/30 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            Likes
          </div>
          <div className="mt-3 text-2xl font-semibold text-neutral-100 tabular-nums">
            {profile.stats.likesReceived}
          </div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/30 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            Reputation
          </div>
          <div className="mt-3 text-2xl font-semibold text-neutral-100 tabular-nums">
            {profile.stats.reputation}
          </div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/30 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            Wallet
          </div>
          <div className="mt-3 text-2xl font-semibold text-neutral-100">
            <span className="font-mono text-emerald-400">€$</span>{" "}
            <span className="tabular-nums">{profile.stats.eurodollars}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ProfileArcChronology
          items={profile.chronology}
          isLocked={!profile.approvedCharacter}
        />

        <section className="rounded-xl border border-neutral-800 bg-neutral-950/30 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            Social
          </div>
          <h2 className="mt-2 text-lg font-semibold text-neutral-100">
            Forum activity
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Public threads, mentions and social traces can be connected here
            after the forum activity model is finalized.
          </p>
        </section>
      </section>
    </div>
  );
}
