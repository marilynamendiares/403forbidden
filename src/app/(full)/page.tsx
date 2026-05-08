// src/app/page.tsx
import Link from "next/link";
import { getAuthSession } from "@/server/session";
import HomeSignOutButton from "@/app/(full)/HomeSignOutButton";

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
      <section className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-16">
        {user ? <UserLanding user={user} /> : <GuestLanding />}
      </section>
    </main>
  );
}

function GuestLanding() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Link
        href="/login"
        className="header-font-archimoto text-[15px] leading-none uppercase text-slate-100 hover:text-white transition"
      >
        login
      </Link>
    </div>
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
      <div className="flex flex-col items-center gap-3">
        <Link
          href="/forum"
          className="header-font-archimoto text-[15px] leading-none uppercase text-slate-100 hover:text-white transition"
        >
          go to forum
        </Link>
        <div className="pt-3">
          <HomeSignOutButton />
        </div>
      </div>
    </div>
  );
}
