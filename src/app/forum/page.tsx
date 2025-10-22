import Link from "next/link";

type Cat = { slug: string; title: string; desc: string | null; _count: { threads: number } };

export const dynamic = "force-dynamic";

export default async function ForumHome() {
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? ""}/api/forum/categories`, { cache: "no-store" });
  const cats: Cat[] = await res.json();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Forum</h1>
      <ul className="grid gap-3">
        {cats.map((c) => (
          <li key={c.slug} className="border border-neutral-800 rounded-xl p-4">
            <Link className="text-lg font-medium hover:underline" href={`/forum/${c.slug}`}>{c.title}</Link>
            {c.desc && <p className="opacity-70 text-sm mt-1">{c.desc}</p>}
            <p className="opacity-60 text-xs mt-2">{c._count.threads} threads</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
