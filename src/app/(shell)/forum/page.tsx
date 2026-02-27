// src/app/(shell)/forum/page.tsx
import Link from "next/link";
import { headers } from "next/headers";
import { ssrFetch } from "@/server/ssrFetch";

import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getSessionUserId } from "@/server/sessionUserId";
import { isPlayer } from "@/server/player";

import ShellVariantSetter from "@/app/shell/ShellVariant";
import ForumPinnedTiles from "@/app/(shell)/forum/ForumPinnedTiles";

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
    <>
      {/* ✅ /forum должен быть широким: растягиваем контент на всю ширину sidebar (center+rail) */}
      <ShellVariantSetter variant="full" />

      <div className="pt-10 space-y-6">
        {items.length === 0 && <p className="opacity-60">No categories yet.</p>}

        {items.length > 0 && (
          <div className="space-y-8">
            {/* NEWS */}
<section className="space-y-6">
  {/* Tiles */}
  <ForumPinnedTiles bgUrl="/textures/forum-hero.jpg" />

  {/* All broadcasts link — теперь ПОД кнопками */}
  <div className="flex justify-end">
    <Link
      href="/forum/news"
      className="text-sm opacity-70 hover:opacity-100 transition-opacity"
    >
      All broadcasts →
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
    </>
  );
}