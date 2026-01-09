// src/app/forum/[category]/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { ssrFetch } from "@/server/ssrFetch";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { isPlayer } from "@/server/player";
import { isAdminSession } from "@/server/admin";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

async function getThreads(category: string, cursor?: string) {
  const h = await headers();
  const origin =
    h.get("origin") ??
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const url = new URL(`${origin}/api/forum/categories/${category}/threads`);
  if (cursor) url.searchParams.set("cursor", cursor);

const res = await ssrFetch(url);

  if (!res.ok) return { items: [] as any[], nextCursor: null as string | null };
  return res.json() as Promise<{ items: any[]; nextCursor: string | null }>;
}

type PageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ cursor?: string }>;
};

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { category } = await params;           // Next 15: await
  const { cursor } = await searchParams;       // Next 15: await

  const { items, nextCursor } = await getThreads(category, cursor);

  // --- ACL: can current user create thread in this category? ---
  const session = await getServerSession(authOptions);
  const admin = isAdminSession(session as any);

  const userId =
    ((session as any)?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined);

  const player = userId ? await isPlayer(userId) : false;

  const cat = await prisma.forumCategory.findUnique({
    where: { slug: category },
    select: { createThreadVisibility: true },
  });

  const createVis = (cat?.createThreadVisibility ?? "PLAYERS") as
    | "PUBLIC"
    | "MEMBERS"
    | "PLAYERS"
    | "ADMIN";

  const canCreateThread =
    admin ||
    (createVis === "MEMBERS" && !!userId) ||
    (createVis === "PUBLIC" && !!userId) || // guests всё равно не смогут (нет session)
    (createVis === "PLAYERS" && player);

  const createHint =
    !userId
      ? "Sign in to create threads."
      : createVis === "ADMIN"
        ? "Only admins can create threads here."
        : createVis === "PLAYERS" && !player
          ? "Create threads is available after character approval."
          : "You can't create threads here.";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{category}</h1>
        <a className="text-sm opacity-70 hover:underline" href="/forum">
          ← All categories
        </a>
      </div>

      <ul className="grid gap-3">
        {items.length === 0 && (
          <p className="opacity-60">No threads yet. Create the first one below.</p>
        )}
        {items.map((t) => (
          <li key={t.slug} className="border border-neutral-800 rounded-xl p-4">
            <Link
              className="text-lg font-medium hover:underline"
              href={`/forum/${category}/${t.slug}`}
            >
              {t.title}
            </Link>
            <p className="opacity-60 text-xs mt-1">
              by {t.author?.profile?.displayName
                  ?? (t.author?.username ? `@${t.author.username}` : "user")}
              {" · "}{t._count.posts} posts
            </p>
          </li>
        ))}
      </ul>

      {nextCursor && (
        <div className="pt-2">
          <Link
            href={`/forum/${category}?cursor=${nextCursor}`}
            className="rounded bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
          >
            Load more
          </Link>
        </div>
      )}

            {canCreateThread ? (
        <CreateThreadForm category={category} />
      ) : (
        <div className="border border-neutral-800 rounded-xl p-4 text-sm opacity-70">
          {createHint}
        </div>
      )}
    </div>
  );
}

function CreateThreadForm({ category }: { category: string }) {
  async function create(formData: FormData) {
    "use server";

    const title = String(formData.get("title") || "");
    const content = String(formData.get("content") || "");

    const cookie = (await cookies()).toString();
    const h = await headers();
    const origin =
      h.get("origin") ??
      `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

    const res = await fetch(`${origin}/api/forum/categories/${category}/threads`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
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
