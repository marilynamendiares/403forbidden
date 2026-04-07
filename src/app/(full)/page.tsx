// src/app/page.tsx
import Link from "next/link";
import { getAuthSession } from "@/server/session";

export const dynamic = "force-dynamic";

type LandingSession = {
  user?: {
    name?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
} | null;

export default async function HomePage() {
  const session = (await getAuthSession()) as LandingSession;
  const user = session?.user ?? null;

  return (
    <main className="min-h-screen text-slate-100">
      {/* Верхний хедер уже у тебя есть в layout, так что здесь только контент */}
      <section className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-16">
        {!user ? <GuestLanding /> : <UserLanding user={user} />}
      </section>
    </main>
  );
}

// --- Блок для НЕзалогиненных юзеров ---
function GuestLanding() {
  return (
    <>
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
          collaborative roleplay forum
        </p>
        <h1 className="text-4xl font-semibold sm:text-5xl">
          Welcome to <span className="text-slate-50">403 Forbidden</span>
        </h1>
        <p className="max-w-xl text-slate-400">
          Cyberpunk stories, collaborative arcs and long-form roleplay. 
          Read public threads, explore the world, and join the writers&apos; circle
          once you sign in.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link
          href="/login"
          className="rounded-full border border-slate-500 px-5 py-2 text-sm font-medium hover:border-slate-300 hover:text-slate-100"
        >
          Sign in / Sign up
        </Link>
        <Link
          href="/forum"
          className="rounded-full bg-slate-100 px-5 py-2 text-sm font-medium text-black hover:bg-white"
        >
          Explore forum
        </Link>
        <Link
          href="/arcs"
          className="rounded-full border border-slate-600 px-5 py-2 text-sm text-slate-300 hover:border-slate-400 hover:text-slate-100"
        >
          Browse arcs
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3 text-sm text-slate-400">
        <div className="space-y-2">
          <p className="font-medium text-slate-200">No account yet?</p>
          <p>
            You can still read public forums and featured arcs. 
            Sign in to create characters, post and collaborate.
          </p>
        </div>
        <div className="space-y-2">
          <p className="font-medium text-slate-200">Long-form stories</p>
          <p>
            Arcs are split into chapters with comment threads, 
            turn queues and soft locks for co-writing.
          </p>
        </div>
        <div className="space-y-2">
          <p className="font-medium text-slate-200">Forum core</p>
          <p>
            Classic threads for OOC talk, worldbuilding and announcements. 
            Start with the public sections, then dive deeper.
          </p>
        </div>
      </div>
    </>
  );
}

// --- Блок для залогиненных юзеров ---
function UserLanding({
  user,
}: {
  user: { name?: string | null; username?: string | null; email?: string | null };
}) {
  const fullName = user?.name || user?.username || user?.email || "user";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <p className="header-font-archimoto text-[15px] leading-none text-slate-300">
        logged in as: {fullName}
      </p>
      <div>
        <Link
          href="/forum"
          className="header-font-archimoto text-[15px] leading-none uppercase text-slate-100 hover:text-white transition"
        >
          go to forum
        </Link>
      </div>
    </div>
  );
}
