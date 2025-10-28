// src/app/forum/[category]/[slug]/page.tsx
import Link from "next/link";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { revalidatePath } from "next/cache";
import ReplyFormClient from "@/components/ReplyFormClient";
import Markdown from "@/components/Markdown";
import { timeAgo } from "@/lib/TimeAgo";
import ThreadLiveClient from "@/components/ThreadLiveClient";

export const dynamic = "force-dynamic";

async function getThread(category: string, slug: string, cursor?: string) {
  const h = await headers();
  const origin =
    h.get("origin") ??
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const url = new URL(`${origin}/api/forum/categories/${category}/threads/${slug}/posts`);
  if (cursor) url.searchParams.set("cursor", cursor);

  const postsRes = await fetch(url, { cache: "no-store" });
  const { items, nextCursor } = postsRes.ok
    ? await postsRes.json()
    : { items: [], nextCursor: null };

  return { posts: items, nextCursor, title: slug.replace(/-/g, " ") };
}

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: { category: string; slug: string };
  searchParams: { cursor?: string };
}) {
  const session = await getServerSession(authOptions);
  const me = (session as any)?.userId as string | undefined;

  // ✅ извлекаем один раз и используем дальше только эти переменные
  const category = String(params.category);
  const slug = String(params.slug);

  const { posts, nextCursor, title } = await getThread(
    category,
    slug,
    searchParams.cursor
  );

  async function removePost(id: string) {
    "use server";
    const cookie = (await cookies()).toString();
    const h = await headers();
    const origin =
      h.get("origin") ??
      `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

    const res = await fetch(`${origin}/api/forum/posts/${id}`, {
      method: "DELETE",
      headers: { cookie },
      cache: "no-store",
    });

    if (!res.ok && res.status !== 204) {
      const text = await res.text().catch(() => "");
      throw new Error(`Failed to delete (${res.status}): ${text}`);
    }

    // ✅ используем category/slug
    revalidatePath(`/forum/${category}/${slug}`);
  }

  // server action для отправки ответа
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

    // ✅ используем category/slug
    revalidatePath(`/forum/${category}/${slug}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <a
          className="text-sm opacity-70 hover:underline"
          href={`/forum/${category}`} // ✅
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

            <Markdown>{p.markdown ?? ""}</Markdown>

            <p className="opacity-50 text-xs mt-2">{timeAgo(p.createdAt)}</p>

            {me && me === p.authorId && (
              <form action={removePost.bind(null, p.id)} className="pt-2">
                <button
                  type="submit"
                  className="text-xs opacity-70 hover:opacity-100 underline"
                >
                  Delete
                </button>
              </form>
            )}
          </li>
        ))}
        {posts.length === 0 && <p className="opacity-60">No posts yet.</p>}
      </ul>

      {nextCursor && (
        <div className="pt-2">
          <Link
            href={`/forum/${category}/${slug}?cursor=${nextCursor}`} // ✅
            className="rounded bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
          >
            Load more posts
          </Link>
        </div>
      )}

      <ReplyFormClient action={send} />

      {/* 🔴 Невидимый SSE-подписчик — обновляет ленту постов в реальном времени */}
      <ThreadLiveClient category={category} slug={slug} /> {/* ✅ */}
    </div>
  );
}
