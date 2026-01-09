// src/app/forum/[category]/[slug]/page.tsx
import Link from "next/link";
import { headers, cookies } from "next/headers";
import { ssrFetch } from "@/server/ssrFetch";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getSessionUserId } from "@/server/sessionUserId";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import ReplyFormClient from "@/components/ReplyFormClient";
import Markdown from "@/components/Markdown";
import { timeAgo } from "@/lib/TimeAgo";
import ThreadLiveClient from "@/components/ThreadLiveClient";
import UserBadge from "@/components/UserBadge";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { isAdminSession } from "@/server/admin";

export const dynamic = "force-dynamic";

async function getThread(category: string, slug: string, cursor?: string) {
  const h = await headers();
  const origin =
    h.get("origin") ??
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const url = new URL(
    `${origin}/api/forum/categories/${category}/threads/${slug}/posts`
  );
  if (cursor) url.searchParams.set("cursor", cursor);

  const postsRes = await ssrFetch(url);

  const { items, nextCursor } = postsRes.ok
    ? await postsRes.json()
    : { items: [], nextCursor: null };

  // fetch thread meta (authorId) to control Delete button visibility
  const metaUrl = new URL(`${origin}/api/forum/categories/${category}/threads/${slug}`);
  const metaRes = await ssrFetch(metaUrl);
  const meta = metaRes.ok ? await metaRes.json().catch(() => null) : null;

  return {
    posts: items,
    nextCursor,
    title: slug.replace(/-/g, " "),
    threadAuthorId: (meta?.authorId as string | null) ?? null,
  };
}

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: { category: string; slug: string };
  searchParams: { cursor?: string };
}) {
  const session = await getServerSession(authOptions);
  const me = getSessionUserId(session);

  const category = String(params.category);
  const slug = String(params.slug);

  const { posts, nextCursor, title, threadAuthorId } = await getThread(
    category,
    slug,
    searchParams.cursor
  );

  const admin = isAdminSession(session as any);
  const canDeleteThread = !!me && (admin || (threadAuthorId && me === threadAuthorId));

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

    revalidatePath(`/forum/${category}/${slug}`);
  }

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

    revalidatePath(`/forum/${category}/${slug}`);
  }

  async function deleteThread() {
    "use server";

    const cookie = (await cookies()).toString();
    const h = await headers();
    const origin =
      h.get("origin") ??
      `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

    const res = await fetch(
      `${origin}/api/forum/categories/${category}/threads/${slug}`,
      {
        method: "DELETE",
        headers: { cookie },
        cache: "no-store",
      }
    );

    if (!res.ok && res.status !== 204) {
      const text = await res.text().catch(() => "");
      throw new Error(`Failed to delete thread (${res.status}): ${text}`);
    }

    // после удаления треда уходим в категорию
    // (revalidate не нужен, потому что будет navigation)
    // но можно оставить для чистоты:
    revalidatePath(`/forum/${category}`);
    redirect(`/forum/${category}`);
  }


  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <a
            className="text-sm opacity-70 hover:underline"
            href={`/forum/${category}`}
          >
            ← Back
          </a>
          <h1 className="text-2xl font-semibold mt-2">{title}</h1>
        </div>

        {canDeleteThread && (
          <form action={deleteThread}>
            <ConfirmSubmitButton
              confirmText="Delete this thread? This will remove all posts."
              className="text-xs rounded border border-red-900/40 bg-red-950/30 px-3 py-2 opacity-80 hover:opacity-100"
            >
              Delete thread
            </ConfirmSubmitButton>
          </form>
        )}
      </div>

      <ul className="grid gap-3">
        {posts.map((p: any) => (
          <li key={p.id} className="border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <UserBadge
                href={`/u/${encodeURIComponent(p.author?.username ?? "user")}`}
                avatar={p.author?.profile?.avatarUrl ?? null}
                username={p.author?.username ?? "user"}
                displayName={p.author?.profile?.displayName ?? null}
                size={24}
              />
              <time className="text-xs opacity-60">{timeAgo(p.createdAt)}</time>
            </div>

            <Markdown>{p.markdown ?? ""}</Markdown>

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
            href={`/forum/${category}/${slug}?cursor=${nextCursor}`}
            className="rounded bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
          >
            Load more posts
          </Link>
        </div>
      )}

      <ReplyFormClient action={send} />
      <ThreadLiveClient category={category} slug={slug} />
    </div>
  );
}
