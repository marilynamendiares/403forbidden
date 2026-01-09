// src/app/forum/page.tsx
import Link from "next/link";
import { headers } from "next/headers";
import { ssrFetch } from "@/server/ssrFetch";

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
  const all = await getCategories();

  // Forum should contain only "discussion" categories
  const FORUM_SLUGS = new Set(["welcome", "support", "offtopic", "player-hub"]);
  const items = all.filter((c) => FORUM_SLUGS.has(c.slug));


  const publicCats = items.filter(
    (c) => (c.readVisibility ?? "MEMBERS") === "PUBLIC"
  );
  const playerCats = items.filter(
    (c) => (c.readVisibility ?? "MEMBERS") !== "PUBLIC"
  );

  const Section = ({ title, list }: { title: string; list: Category[] }) => (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">
        {title}
      </h2>
      <ul className="grid gap-3">
        {list.map((c) => (
          <li
            key={c.slug}
            className="border border-neutral-800 rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <Link
                href={`/forum/${c.slug}`}
                className="font-medium hover:underline"
              >
                {c.title}
              </Link>
              {c.desc && <p className="text-xs opacity-70 mt-1">{c.desc}</p>}
            </div>
            <span className="text-xs opacity-60">
              {c._count.threads} threads
            </span>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Forum</h1>
        <a className="text-sm opacity-70 hover:underline" href="/forum">
          All categories
        </a>
      </div>

      {items.length === 0 && <p className="opacity-60">No categories yet.</p>}

      {items.length > 0 && (
        <div className="space-y-8">
          {publicCats.length > 0 && <Section title="Public" list={publicCats} />}
          {playerCats.length > 0 && (
            <Section title="For Players" list={playerCats} />
          )}
        </div>
      )}
    </div>
  );
}