// src/app/u/[username]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/server/db";
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

  const name = user.profile?.displayName || user.username;
  const avatar = user.profile?.avatarUrl || "/default-avatar.svg";
  const banner = user.profile?.bannerUrl || null;
  const bio = user.profile?.bio || "";

  return (
    <div className="mx-auto max-w-3xl py-8 space-y-6 px-4">
      {/* Баннер */}
      <div className="w-full h-40 rounded-2xl bg-neutral-900 overflow-hidden">
        {banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner} alt={`${name} banner`} className="w-full h-full object-cover" />
        ) : null}
      </div>

      <div className="flex items-start gap-4">
        {/* Аватар */}
        <div className="-mt-16 w-28 h-28 rounded-full ring-4 ring-black overflow-hidden bg-neutral-800 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatar} alt={`${name} avatar`} className="w-full h-full object-cover" />
        </div>

        <div className="pt-2">
          <h1 className="text-2xl font-semibold">{name}</h1>
          <p className="opacity-70">@{user.username}</p>
        </div>

        {isMe && (
          <a
            href="/settings/profile"
            className="ml-auto rounded-lg border px-3 py-2 text-sm hover:bg-accent"
          >
            Edit profile
          </a>
        )}
      </div>

      {bio ? (
        <div className="prose prose-invert max-w-none">
          <p className="whitespace-pre-wrap">{bio}</p>
        </div>
      ) : (
        <p className="opacity-60">No bio yet.</p>
      )}

      <section className="border border-neutral-800 rounded-xl p-4">
        <h2 className="text-lg font-medium mb-2">Books</h2>
        <p className="opacity-60 text-sm">No books yet. (soon)</p>
      </section>

      <section className="border border-neutral-800 rounded-xl p-4">
        <h2 className="text-lg font-medium mb-2">Forum activity</h2>
        <p className="opacity-60 text-sm">No threads yet. (soon)</p>
      </section>
    </div>
  );
}
