// src/app/u/[username]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/server/db";
import { ThumbsUp, Star } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

// для Next 15: params — Promise
type Params = { params: Promise<{ username: string }> };

// SEO заголовок на основе профиля
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      username: true,
      profile: { select: { displayName: true, bio: true } },
    },
  });

  if (!user) return { title: "Profile not found" };

  const titleName = user.profile?.displayName ?? user.username;
  return {
    title: `${titleName} — Profile`,
    description: user.profile?.bio ?? `Public profile of ${titleName}`,
    openGraph: {
      title: `${titleName} — Profile`,
      description: user.profile?.bio ?? `@${user.username}`,
    },
  };
}

// SSR-страница публичного профиля
export default async function PublicProfilePage({ params }: Params) {
  const { username } = await params;

  const [session, user] = await Promise.all([
    getServerSession(authOptions),
    prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        profile: {
          select: {
            displayName: true,
            bio: true,
            avatarUrl: true,
            bannerUrl: true,
          },
        },
      },
    }),
  ]);

  if (!user) notFound();

  const isMe = (session as any)?.userId === user.id;

  // ── Economy / Social stats ───────────────────────────────────
  const [wallet, likesReceived] = await Promise.all([
    prisma.wallet.findUnique({
      where: { userId: user.id },
      select: { eurodollars: true, reputationTotal: true },
    }),
    prisma.chapterPostLike.count({
      where: { post: { authorId: user.id } },
    }),
  ]);

  const eurodollars = wallet?.eurodollars ?? 0;
  const reputation = wallet?.reputationTotal ?? 0;
  // ─────────────────────────────────────────────────────────────

  const name = user.profile?.displayName || user.username;
  const avatar = user.profile?.avatarUrl || "/default-avatar.svg";
  const banner = user.profile?.bannerUrl || null;
  const bio = user.profile?.bio || "";

  return (
    <div className="py-8 space-y-6">
      {/* HERO (2-row layout: top aligns by avatar only; stats are separate row) */}
      <section className="grid grid-cols-12 gap-6">
        {/* ── TOP ROW ───────────────────────────────────────────── */}
        {/* LEFT: AVATAR */}
        <div className="col-span-12 md:col-span-3">
          <div className="aspect-square w-full max-w-55 rounded-2xl overflow-hidden bg-neutral-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatar}
              alt={`${name} avatar`}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* RIGHT: BANNER + NAME ROW (height follows avatar only, not stats) */}
        <div className="col-span-12 md:col-span-9">
          <div className="grid h-full grid-rows-[auto_auto] gap-2">
            {/* Banner: smaller */}
            <div className="h-36 rounded-2xl bg-neutral-900 overflow-hidden">
              {banner ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={banner}
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
                  @{user.username}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/u/${encodeURIComponent(user.username)}/inventory`}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-900"
                >
                  Inventory
                </a>

                {isMe && (
                  <a
                    href="/settings/profile"
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-accent"
                  >
                    Edit profile
                  </a>
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
              <span className="tabular-nums">{likesReceived}</span>
            </div>

            <div className="inline-flex items-center gap-2 text-neutral-300">
              <Star className="h-4 w-4 text-neutral-500" />
              <span className="tabular-nums">{reputation}</span>
            </div>

            <div className="inline-flex items-center gap-2">
              <span className="font-mono text-emerald-400">€$</span>
              <span className="tabular-nums text-neutral-300">
                {eurodollars}
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
        <h2 className="text-lg font-medium mb-2">Books</h2>
        <p className="opacity-60 text-sm">No books yet. (soon)</p>
      </section>

      <section className="border border-neutral-800 rounded-xl p-4">
        <h2 className="text-lg font-medium mb-2">Threads</h2>
        <p className="opacity-60 text-sm">No threads yet. (soon)</p>
      </section>
    </div>
  );
}
