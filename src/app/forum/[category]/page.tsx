import Link from "next/link";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function getThreads(category: string) {
  // В RSC безопаснее собрать origin из заголовков
  const h = await headers();
  const origin =
    h.get("origin") ??
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const res = await fetch(`${origin}/api/forum/categories/${category}/threads`, {
    cache: "no-store",
  });
  if (!res.ok) return { items: [] as any[] };
  return res.json();
}

export default async function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const data = await getThreads(params.category);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{params.category}</h1>
        <a className="text-sm opacity-70 hover:underline" href="/forum">
          ← All categories
        </a>
      </div>

      <ul className="grid gap-3">
        {data.items.map((t: any) => (
          <li key={t.slug} className="border border-neutral-800 rounded-xl p-4">
            <Link
              className="text-lg font-medium hover:underline"
              href={`/forum/${params.category}/${t.slug}`}
            >
              {t.title}
            </Link>
            <p className="opacity-60 text-xs mt-1">
              by{" "}
              {t.author.profile?.displayName ??
                t.author.profile?.username ??
                "user"}{" "}
              · {t._count.posts} posts
            </p>
          </li>
        ))}
        {data.items.length === 0 && <p className="opacity-60">No threads yet.</p>}
      </ul>

      <CreateThreadForm category={params.category} />
    </div>
  );
}

function CreateThreadForm({ category }: { category: string }) {
  async function create(formData: FormData) {
    "use server";

    const title = String(formData.get("title") || "");
    const content = String(formData.get("content") || "");

    // ОБЯЗАТЕЛЬНО: cookie + корректный origin
    const cookie = (await cookies()).toString();
    const h = await headers();
    const origin =
      h.get("origin") ??
      `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

    const res = await fetch(`${origin}/api/forum/categories/${category}/threads`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({ title, content }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Failed to create thread (${res.status}): ${text}`);
    }

    const data = await res.json(); // { id, slug }
    redirect(`/forum/${category}/${data.slug}`);
  }

  return (
    <form action={create} className="border border-neutral-800 rounded-xl p-4 space-y-2">
      <h2 className="text-lg font-medium">New thread</h2>
      <input
        name="title"
        placeholder="Title"
        className="w-full rounded bg-transparent border border-neutral-700 px-3 py-2"
      />
      <textarea
        name="content"
        placeholder="First post (markdown)"
        className="w-full rounded bg-transparent border border-neutral-700 px-3 py-2"
        rows={6}
      />
      <button className="rounded bg-white text-black px-4 py-2">Create</button>
      <p className="opacity-60 text-xs">Requires sign-in.</p>
    </form>
  );
}
