import Link from "next/link";
import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function getThread(category: string, slug: string) {
  const h = await headers();
  const origin =
    h.get("origin") ??
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const postsRes = await fetch(
    `${origin}/api/forum/categories/${category}/threads/${slug}/posts`,
    { cache: "no-store" }
  );
  const posts = postsRes.ok ? await postsRes.json() : [];
  return { posts, title: slug.replace(/-/g, " ") };
}

export default async function ThreadPage({
  params,
}: {
  params: { category: string; slug: string };
}) {
  const { posts, title } = await getThread(params.category, params.slug);

  return (
    <div className="space-y-6">
      <div>
        <a
          className="text-sm opacity-70 hover:underline"
          href={`/forum/${params.category}`}
        >
          ← Back
        </a>
        <h1 className="text-2xl font-semibold mt-2">{title}</h1>
      </div>

      <ul className="grid gap-3">
        {posts.map((p: any) => (
          <li key={p.id} className="border border-neutral-800 rounded-xl p-4">
            <p className="opacity-60 text-xs mb-2">
              {p.author?.profile?.displayName ??
                p.author?.profile?.username ??
                "user"}
            </p>
            <div className="prose prose-invert whitespace-pre-wrap">
              {p.markdown}
            </div>
          </li>
        ))}
        {posts.length === 0 && <p className="opacity-60">No posts yet.</p>}
      </ul>

      <ReplyForm category={params.category} slug={params.slug} />
    </div>
  );
}

function ReplyForm({ category, slug }: { category: string; slug: string }) {
  async function send(formData: FormData) {
    "use server";

    const content = String(formData.get("content") || "");
    const cookie = (await cookies()).toString();
    const h = await headers();
    const origin =
      h.get("origin") ??
      `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

    const res = await fetch(
      `${origin}/api/forum/categories/${category}/threads/${slug}/posts`,
      {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ content }),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Failed to reply (${res.status}): ${text}`);
    }

    // Без перезагрузки страницы: инвалидация текущего маршрута
    revalidatePath(`/forum/${category}/${slug}`);
    // Возвращать ничего не нужно — RSC перерендерится автоматически
  }

  return (
    <form
      action={send}
      className="border border-neutral-800 rounded-xl p-4 space-y-2"
    >
      <h2 className="text-lg font-medium">Reply</h2>
      <textarea
        name="content"
        placeholder="Your reply (markdown)"
        className="w-full rounded bg-transparent border border-neutral-700 px-3 py-2"
        rows={5}
      />
      <button className="rounded bg-white text-black px-4 py-2">Send</button>
      <p className="opacity-60 text-xs">Requires sign-in.</p>
    </form>
  );
}
