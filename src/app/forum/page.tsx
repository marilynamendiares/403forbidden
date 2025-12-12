// src/app/forum/page.tsx
import Link from "next/link";
import { headers } from "next/headers";

export const dynamic = "force-dynamic"; // не кешируем
export const revalidate = 0;

type Category = {
  id: string;
  slug: string;
  title: string;
  desc: string | null;
  _count: { threads: number };
};

async function getCategories(): Promise<Category[]> {
  const h = await headers();
  const origin =
    h.get("origin") ??
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const url = new URL(`${origin}/api/forum/categories`);

  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return [];
    // API возвращает МАССИВ категорий
    const data = (await r.json()) as Category[] | any;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function ForumIndexPage() {
  const items = await getCategories();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Forum</h1>
        <a className="text-sm opacity-70 hover:underline" href="/forum">
          All categories
        </a>
      </div>

      <ul className="grid gap-3">
        {items.length === 0 && (
          <p className="opacity-60">No categories yet.</p>
        )}

        {items.map((c) => (
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
              {c.desc && (
                <p className="text-xs opacity-70 mt-1">{c.desc}</p>
              )}
            </div>
            <span className="text-xs opacity-60">
              {c._count.threads} threads
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
