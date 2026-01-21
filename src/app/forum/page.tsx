// src/app/forum/page.tsx
import Link from "next/link";
import { headers } from "next/headers";
import { ssrFetch } from "@/server/ssrFetch";

import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getSessionUserId } from "@/server/sessionUserId";
import { isPlayer } from "@/server/player";

export const dynamic = "force-dynamic"; // не кешируем
export const revalidate = 0;

type Category = {
  id: string;
  slug: string;
  title: string;
  desc: string | null;
  _count: { threads: number };
  readVisibility?: "PUBLIC" | "MEMBERS" | "PLAYERS" | "ADMIN" | null;
};

async function getCategories(): Promise<Category[]> {
  const h = await headers();
  const origin =
    h.get("origin") ??
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const url = new URL(`${origin}/api/forum/categories`);

  try {
    // ✅ IMPORTANT: forward cookies so /api can see the logged-in user
    const r = await ssrFetch(url);

    if (!r.ok) return [];
    // API возвращает МАССИВ категорий
    const data = (await r.json()) as Category[] | any;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function ForumIndexPage() {
  const [all, session] = await Promise.all([
    getCategories(),
    getServerSession(authOptions),
  ]);

  const me = getSessionUserId(session);
  const player = me ? await isPlayer(me) : false;


  // Forum should contain only "discussion" categories
  const FORUM_SLUGS = new Set(["welcome", "support", "offtopic", "player-hub"]);
  const items = all.filter((c) => FORUM_SLUGS.has(c.slug));


// single ordered list (no section headings)
const ORDERED_SLUGS = ["welcome", "offtopic", "player-hub", "support"] as const;

// restrict visibility: non-player only sees PUBLIC categories
const visible = items
  .filter((c) => {
    const vis = (c.readVisibility ?? "MEMBERS") as string;
    if (player) return true;
    return vis === "PUBLIC";
  })
  .sort((a, b) => {
    const ai = ORDERED_SLUGS.indexOf(a.slug as any);
    const bi = ORDERED_SLUGS.indexOf(b.slug as any);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });


  return (
    <div className="space-y-6">

      {items.length === 0 && <p className="opacity-60">No categories yet.</p>}

{items.length > 0 && (
  <div className="space-y-8">
{/* NEWS (moved from World, keep 1:1 visuals) */}
<section className="space-y-4">
  <div className="flex items-center justify-between">
    <div className="text-xs font-mono uppercase tracking-[0.22em] opacity-60">
      NEWS
    </div>

    <Link href="/forum/news" className="text-sm opacity-70 hover:underline">
      All broadcasts →
    </Link>
  </div>

  <div className="grid md:grid-cols-2 gap-3 auto-rows-fr">
    {/* Announcements (Public) */}
    <Link
      href="/forum/news/public"
      className="md:row-span-2 h-full border border-white/10 rounded-2xl p-5 bg-white/2 hover:bg-white/4 transition"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="text-sm font-semibold">Announcements (Public)</div>
          <div className="text-xs font-mono uppercase tracking-[0.22em] opacity-50">
            PUBLIC
          </div>
        </div>
        <p className="text-sm opacity-70">
          Official updates, bulletins, announcements.
        </p>
      </div>
    </Link>

    {/* Announcements (Players) */}
    {player ? (
      <Link
        href="/forum/news/players"
        className="h-full border border-white/10 rounded-2xl p-5 bg-white/2 hover:bg-white/4 transition"
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="text-sm font-semibold">Announcements (Players)</div>
            <div className="text-xs font-mono uppercase tracking-[0.22em] opacity-50">
              PLAYERS
            </div>
          </div>
          <p className="text-sm opacity-70">
            Players-only updates and internal notices.
          </p>
        </div>
      </Link>
    ) : (
      <div className="h-full border border-white/10 rounded-2xl p-5 bg-white/2 transition opacity-70">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="text-sm font-semibold">Announcements (Players)</div>
            <div className="text-xs font-mono uppercase tracking-[0.22em] opacity-50">
              PLAYERS
            </div>
          </div>
          <p className="text-sm opacity-70">
            Players-only updates and internal notices.
          </p>
          <div className="text-xs font-mono uppercase tracking-[0.22em] opacity-50">
            ACCESS RESTRICTED
          </div>
        </div>
      </div>
    )}

    {/* Developer Changelog */}
    <Link
      href="/forum/news/devlog"
      className="h-full border border-white/10 rounded-2xl p-5 bg-white/2 hover:bg-white/4 transition"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="text-sm font-semibold">Developer Changelog</div>
          <div className="text-xs font-mono uppercase tracking-[0.22em] opacity-50">
            DEVLOG
          </div>
        </div>
        <p className="text-sm opacity-70">
          Patch notes and platform updates.
        </p>
      </div>
    </Link>
  </div>
</section>


{visible.length > 0 && (
  <ul className="grid gap-3">
    {visible.map((c) => (
      <li
        key={c.slug}
        className="border border-neutral-800 rounded-xl p-4 flex items-center justify-between"
      >
        <div>
          <Link href={`/forum/${c.slug}`} className="font-medium hover:underline">
            {c.title}
          </Link>
          {c.desc && <p className="text-xs opacity-70 mt-1">{c.desc}</p>}
        </div>
        <span className="text-xs opacity-60">{c._count.threads} threads</span>
      </li>
    ))}
  </ul>
)}

  </div>
)}

    </div>
  );
}