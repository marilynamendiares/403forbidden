// src/app/u/[username]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ThumbsUp, Star } from "lucide-react";
import AvatarImg from "@/components/avatarImg";
import { resolveMediaUrl } from "@/lib/media";
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
  const name = profile.user.displayName;
  const bio = profile.user.bio;


  return (
    <div className="pb-8 space-y-6">
      {/* HERO (2-row layout: top aligns by avatar only; stats are separate row) */}
      <section className="grid grid-cols-12 gap-6">
        {/* ── TOP ROW ───────────────────────────────────────────── */}
        {/* LEFT: AVATAR */}
        <div className="col-span-12 md:col-span-3">
          <div className="aspect-square w-full max-w-55 rounded-2xl overflow-hidden bg-neutral-900">
            <AvatarImg
              src={profile.user.avatarUrl ?? undefined}
              alt={`${name} avatar`}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* RIGHT: BANNER + NAME ROW (height follows avatar only, not stats) */}
        <div className="col-span-12 md:col-span-9">
          <div className="grid h-full grid-rows-[auto_auto] gap-2">
            <div className="h-36 rounded-2xl bg-neutral-900 overflow-hidden">
              {profile.user.bannerUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveMediaUrl(profile.user.bannerUrl) ?? ""}
                  alt={`${name} banner`}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>

            {/* Name row: sits under banner, independent of stats */}
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold leading-tight">{name}</h1>
                <p className="mt-1 text-lg opacity-70 leading-none">
                  @{profile.user.username}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/u/${encodeURIComponent(profile.user.username)}/inventory`}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-900"
                >
                  Inventory
                </Link>

                {isMe && (
                  <Link
                    href="/profile/settings"
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-accent"
                  >
                    Edit profile
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM ROW ────────────────────────────────────────── */}
        {/* LEFT: stats */}
        <div className="col-span-12 md:col-span-3">
          <div className="mt-3 flex items-center gap-5 text-sm">
            <div className="inline-flex items-center gap-2 text-neutral-300">
              <ThumbsUp className="h-4 w-4 text-neutral-500" />
              <span className="tabular-nums">{profile.stats.likesReceived}</span>
            </div>

            <div className="inline-flex items-center gap-2 text-neutral-300">
              <Star className="h-4 w-4 text-neutral-500" />
              <span className="tabular-nums">{profile.stats.reputation}</span>
            </div>

            <div className="inline-flex items-center gap-2">
              <span className="font-mono text-emerald-400">€$</span>
              <span className="tabular-nums text-neutral-300">
                {profile.stats.eurodollars}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: bio aligned with stats row */}
        <div className="col-span-12 md:col-span-9">
          <div className="mt-3">
            {bio ? (
              <div className="text-sm text-neutral-300/80 whitespace-pre-wrap">
                {bio}
              </div>
            ) : (
              <p className="text-sm opacity-50">No bio yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* Placeholders below */}
      <section className="border border-neutral-800 rounded-xl p-4">
        <h2 className="text-lg font-medium mb-2">Arcs</h2>
        <p className="opacity-60 text-sm">No arcs yet. (soon)</p>
      </section>

      <section className="border border-neutral-800 rounded-xl p-4">
        <h2 className="text-lg font-medium mb-2">Threads</h2>
        <p className="opacity-60 text-sm">No threads yet. (soon)</p>
      </section>
    </div>
  );
}
