// src/app/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const user = (session as any)?.user;

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
          Cyberpunk stories, collaborative books and long-form roleplay. 
          Read public threads, explore the world, and join the writers&apos; circle
          once you sign in.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link
          href="/api/auth/signin"
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
          href="/books"
          className="rounded-full border border-slate-600 px-5 py-2 text-sm text-slate-300 hover:border-slate-400 hover:text-slate-100"
        >
          Browse books
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3 text-sm text-slate-400">
        <div className="space-y-2">
          <p className="font-medium text-slate-200">No account yet?</p>
          <p>
            You can still read public forums and featured books. 
            Sign in to create characters, post and collaborate.
          </p>
        </div>
        <div className="space-y-2">
          <p className="font-medium text-slate-200">Long-form stories</p>
          <p>
            Books are split into chapters with comment threads, 
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
function UserLanding({ user }: { user: any }) {
  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
          dashboard
        </p>
      </div>

      {/* 3 колонки × 2 ряда, как в рефе */}
      <div className="grid gap-6 text-sm md:grid-cols-3 md:auto-rows-[220px]">
        {/* Левый высокий красный блок – на две строки */}
        <div className="rounded-[32px] bg-[#C15A48] overflow-hidden flex flex-col justify-between p-6 md:row-span-2">
          <div className="flex items-start justify-between text-[10px] uppercase tracking-[0.3em] text-slate-100/80">
            <span>01</span>
            <span>cyberpunk • tech 2025</span>
          </div>

          <div className="mt-8 max-w-sm text-xs text-slate-100/85 leading-relaxed">
            Placeholder for a tall visual block. Later we&apos;ll drop in art /
            stats / character info here.
          </div>

          <div className="mt-6 text-right text-[11px] uppercase tracking-[0.25em] text-slate-100/70">
            独創
          </div>
        </div>

        {/* Верхний правый – оранжевый, span на 2 колонки */}
        <div className="rounded-[32px] bg-[#E39B4F] overflow-hidden flex flex-col justify-between p-6 md:col-span-2">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold tracking-[0.25em] uppercase text-slate-900">
              CBRPNK
            </h2>
            <span className="mt-1 h-2 w-2 rounded-full bg-slate-900/80" />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-4 text-[11px] text-slate-900/80">
            <div>
              <p className="mb-1 font-medium tracking-wide">UA 570-B</p>
              <p className="text-[10px] uppercase tracking-[0.2em] leading-snug">
                rounds remaining / time at 100%
              </p>
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-xs uppercase tracking-[0.2em]">rounds</p>
              <p className="text-base font-semibold">571</p>
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-xs uppercase tracking-[0.2em]">time (sec)</p>
              <p className="text-base font-semibold">2.47</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-900/70">
            <span>#EOA15E</span>
            <span>corp.sys</span>
          </div>
        </div>

        {/* Нижний зелёный – 2-я колонка, 2-й ряд */}
        <div className="rounded-[32px] bg-[#4E7F5F] overflow-hidden flex flex-col justify-between p-6 md:col-start-2 md:row-start-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-slate-100/80">
            <span>dpm systm</span>
            <span>©2023</span>
          </div>

          <div className="mt-5 text-xs text-slate-100/85 leading-relaxed">
            Placeholder area for system metrics or chapter progress.
          </div>

          <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-[0.25em] text-slate-100/80">
            <span>ts26</span>
            <span>sort before sending</span>
          </div>
        </div>

        {/* Нижний серый – 3-я колонка, 2-й ряд */}
        <div className="rounded-[32px] bg-[#B4B4B7] overflow-hidden flex flex-col justify-between p-6 md:col-start-3 md:row-start-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-900/80">
              retro ai <br />
              tecnology
            </div>
            <div className="h-7 w-7 rounded-xl bg-slate-900/80" />
          </div>

          <div className="mt-5 text-4xl font-bold leading-none tracking-tight text-slate-900/90">
            2<span className="text-[#C3483C]">5</span>
          </div>

          <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-slate-900/70">
            reserved for future infographics
          </div>
        </div>
      </div>
    </>
  );
}
