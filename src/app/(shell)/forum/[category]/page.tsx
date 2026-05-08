// src/app/forum/[category]/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSession } from "@/server/admin";
import { getSessionViewer, requireSessionUserId } from "@/server/session";
import { getThreadsByCategory } from "@/server/repos/forum";
import { createThreadForUser, ForumHttpError } from "@/server/services/forum";
import {
  canReadForumCategory,
  getForumCategoryAccessCopy,
  getForumCategoryCreateStateForViewer,
  getForumCategoryTier,
} from "@/server/services/forumCategories";
import { prisma } from "@/server/db";
import { timeAgo } from "@/lib/TimeAgo";

export const dynamic = "force-dynamic";

async function getThreads(category: string, cursor?: string, includeHidden?: boolean) {
  const data = await getThreadsByCategory({
    categorySlug: category,
    take: 20,
    cursorId: cursor,
    includeHidden,
  });

  return {
    items: data.items as ThreadListItem[],
    nextCursor: data.nextCursor,
  };
}

type ThreadListItem = {
  slug: string;
  title: string;
  createdAt: string | Date;
  lastActivityAt?: string | Date;
  updatedAt: string | Date;
  locked?: boolean;
  hiddenAt?: string | Date | null;
  hiddenById?: string | null;
  author?: {
    username?: string | null;
    profile?: {
      displayName?: string | null;
    } | null;
  } | null;
  _count: {
    posts: number;
  };
};

type PageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ cursor?: string }>;
};

function ThreadList({
  category,
  items,
  isAdmin,
}: {
  category: string;
  items: ThreadListItem[];
  isAdmin: boolean;
}) {
  if (items.length === 0) {
    return <p className="opacity-60">No threads yet. Create the first one below.</p>;
  }

  return (
    <ul className="grid gap-3">
      {items.map((thread) => (
        <li
          key={thread.slug}
          className={[
            "rounded-xl border p-4",
            thread.locked
              ? "border-neutral-900 bg-neutral-950/25 opacity-80"
              : "border-neutral-800",
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                className={[
                  "text-lg font-medium",
                  thread.locked ? "text-neutral-300" : "hover:underline",
                ].join(" ")}
                href={`/forum/${category}/${thread.slug}`}
              >
                {thread.title}
              </Link>
              <p className="mt-1 text-xs opacity-60">
                by {thread.author?.profile?.displayName
                  ?? (thread.author?.username ? `@${thread.author.username}` : "user")}
                {" · "}
                {thread._count.posts} posts
              </p>
              {(thread.locked || (isAdmin && thread.hiddenAt)) ? (
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                  {thread.locked ? (
                    <span className="rounded border border-white/10 px-2 py-1">Locked</span>
                  ) : null}
                  {isAdmin && thread.hiddenAt ? (
                    <span className="rounded border border-white/10 px-2 py-1">
                      Hidden
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="shrink-0 text-right text-xs opacity-60">
              <div>Active {timeAgo(thread.lastActivityAt ?? thread.updatedAt)}</div>
              {isAdmin && thread.hiddenAt ? (
                <div className="mt-1 text-neutral-500">
                  Hidden {new Date(thread.hiddenAt).toLocaleString()}
                </div>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function LockedCategoryScreen({
  category,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  category: string;
  title: string;
  description: string;
  actionHref: string | null;
  actionLabel: string | null;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{category}</h1>
        <Link className="text-sm opacity-70 hover:underline" href="/forum">
          ← All categories
        </Link>
      </div>

      <section className="rounded-xl border border-neutral-900 bg-neutral-950/35 p-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          Access denied
        </div>
        <h2 className="mt-2 text-xl font-semibold text-neutral-100">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
          {description}
        </p>
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="mt-4 inline-flex rounded-md border border-neutral-700 px-3 py-2 text-sm hover:border-neutral-500 hover:bg-neutral-900"
          >
            {actionLabel}
          </Link>
        ) : null}
      </section>
    </div>
  );
}

function CategoryCreateState({
  canCreateThread,
  createHint,
  category,
}: {
  canCreateThread: boolean;
  createHint: string;
  category: string;
}) {
  if (canCreateThread) {
    return <CreateThreadForm category={category} />;
  }

  return <div className="rounded-xl border border-neutral-800 p-4 text-sm opacity-70">{createHint}</div>;
}

function rethrowForumActionError(action: string, error: unknown): never {
  if (error instanceof ForumHttpError) {
    throw new Error(`Failed to ${action} (${error.status}): ${error.message}`);
  }
  throw error;
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { category } = await params;           // Next 15: await
  const { cursor } = await searchParams;       // Next 15: await
  const { session, userId } = await getSessionViewer();
  const admin = isAdminSession(session);
  const tier = await getForumCategoryTier({ userId, isAdmin: admin });
  const categoryPolicy = await prisma.forumCategory.findUnique({
    where: { slug: category },
    select: { readVisibility: true },
  });
  const readVisibility = (categoryPolicy?.readVisibility ?? "MEMBERS") as
    | "PUBLIC"
    | "MEMBERS"
    | "PLAYERS";
  const canReadCategory = canReadForumCategory({ tier, readVisibility });

  if (!canReadCategory) {
    const access = getForumCategoryAccessCopy({ userId, readVisibility });
    return (
      <LockedCategoryScreen
        category={category}
        title={access.title}
        description={access.description}
        actionHref={access.actionHref}
        actionLabel={access.actionLabel}
      />
    );
  }

  const { items, nextCursor } = await getThreads(category, cursor, admin);
  const { canCreateThread, createHint } = await getForumCategoryCreateStateForViewer({
    categorySlug: category,
    userId,
    isAdmin: admin,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{category}</h1>
        <Link className="text-sm opacity-70 hover:underline" href="/forum">
          ← All categories
        </Link>
      </div>

      <ThreadList category={category} items={items} isAdmin={admin} />

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

      <CategoryCreateState
        canCreateThread={canCreateThread}
        createHint={createHint}
        category={category}
      />
    </div>
  );
}

function CreateThreadForm({ category }: { category: string }) {
  async function create(formData: FormData) {
    "use server";

    const title = String(formData.get("title") || "");
    const content = String(formData.get("content") || "");
    const { session } = await getSessionViewer();
    const userId = await requireSessionUserId();

    try {
      const data = await createThreadForUser({
        category,
        userId,
        isAdmin: Boolean(isAdminSession(session)),
        title,
        content,
      });
      redirect(`/forum/${category}/${data.slug}`);
    } catch (error) {
      rethrowForumActionError("create thread", error);
    }
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
