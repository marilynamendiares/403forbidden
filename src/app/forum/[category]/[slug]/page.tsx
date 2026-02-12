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
import ThreadPostsClient from "@/features/forum/ui/ThreadPostsClient";
import UserBadge from "@/components/UserBadge";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { isAdminSession } from "@/server/admin";

export const dynamic = "force-dynamic";

// Next 15: params/searchParams — Promise
type PageProps = {
  params: Promise<{ category: string; slug: string }>;
  searchParams: Promise<{ cursor?: string }>;
};

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
  const metaUrl = new URL(
    `${origin}/api/forum/categories/${category}/threads/${slug}`
  );
  const metaRes = await ssrFetch(metaUrl);
  const meta = metaRes.ok ? await metaRes.json().catch(() => null) : null;

  return {
    posts: items,
    nextCursor,
    title: slug.replace(/-/g, " "),
    threadAuthorId: (meta?.authorId as string | null) ?? null,
  };
}

export default async function ThreadPage({ params, searchParams }: PageProps) {
  const { category, slug } = await params;
  const sp = await searchParams;

  const session = await getServerSession(authOptions);
  const me = getSessionUserId(session);

  const { posts, nextCursor, title, threadAuthorId } = await getThread(
    String(category),
    String(slug),
    sp?.cursor
  );

  const admin = isAdminSession(session as any);
  const canDeleteThread =
    !!me && (admin || (threadAuthorId && me === threadAuthorId));

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

      <ThreadPostsClient
        category={String(category)}
        slug={String(slug)}
        initialPosts={posts}
        initialNextCursor={nextCursor}
        meId={me ?? null}
        removePostAction={removePost}
      />

      <ReplyFormClient action={send} />

    </div>
  );
}
