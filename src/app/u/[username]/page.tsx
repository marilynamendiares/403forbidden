// src/app/u/[username]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/server/db";

type Params = { params: { username: string } };

// SEO заголовок на основе профиля
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const username = params.username;
  const profile = await prisma.profile.findUnique({
    where: { username },
    select: { displayName: true },
  });

  const titleName = profile?.displayName ?? username;
  return {
    title: `${titleName} — Profile`,
    description: `Public profile of ${titleName}`,
  };
}

// SSR-страница публичного профиля
export default async function PublicProfilePage({ params }: Params) {
  const username = params.username;

  const profile = await prisma.profile.findUnique({
    where: { username },
    select: {
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      bannerUrl: true,
      user: {
        select: {
          id: true,
          // email: true, // публично показывать не будем
        },
      },
      // TODO: позже добавим книги/темы/посты
    },
  });

  if (!profile) {
    notFound();
  }

  const title = profile.displayName || profile.username;

  return (
    <div className="mx-auto max-w-3xl py-8 space-y-6">
      {/* Баннер */}
      <div className="w-full h-40 rounded-2xl bg-neutral-900 overflow-hidden">
        {profile.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.bannerUrl}
            alt={`${title} banner`}
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>

      <div className="flex items-start gap-4">
        {/* Аватар */}
        <div className="-mt-16 w-28 h-28 rounded-full ring-4 ring-black overflow-hidden bg-neutral-800 shrink-0">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={`${title} avatar`}
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>

        <div className="pt-2">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="opacity-70">@{profile.username}</p>
        </div>
      </div>

      {/* Bio */}
      {profile.bio ? (
        <div className="prose prose-invert max-w-none">
          <p className="whitespace-pre-wrap">{profile.bio}</p>
        </div>
      ) : (
        <p className="opacity-60">No bio yet.</p>
      )}

      {/* Placeholder секции на будущее */}
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
