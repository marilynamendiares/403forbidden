// src/app/forum/[category]/[slug]/page.tsx
import Link from "next/link";
import { getSessionViewer } from "@/server/session";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import ThreadInteractionClient from "@/features/forum/ui/ThreadInteractionClient";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { isAdminSession } from "@/server/admin";
import { getThreadPostsByCategoryAndSlug } from "@/server/repos/forum";
import {
  createThreadPostForUser,
  deleteThreadForUser,
  deleteThreadPostForUser,
  ForumHttpError,
  setThreadHiddenForAdmin,
  setThreadLockedForUser,
  setThreadPostHiddenForAdmin,
} from "@/server/services/forum";

export const dynamic = "force-dynamic";

// Next 15: params/searchParams — Promise
type PageProps = {
  params: Promise<{ category: string; slug: string }>;
  searchParams: Promise<{ cursor?: string }>;
};

function ThreadHeader({
  category,
  title,
  canDeleteThread,
  canModerateThread,
  canLockThread,
  isThreadLocked,
  isThreadHidden,
  onDelete,
  onToggleLock,
  onToggleHidden,
}: {
  category: string;
  title: string;
  canDeleteThread: boolean;
  canModerateThread: boolean;
  canLockThread: boolean;
  isThreadLocked: boolean;
  isThreadHidden: boolean;
  onDelete: () => Promise<void>;
  onToggleLock: () => Promise<void>;
  onToggleHidden: () => Promise<void>;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Link className="text-sm opacity-70 hover:underline" href={`/forum/${category}`}>
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {canModerateThread ? (
          <form action={onToggleHidden}>
            <ConfirmSubmitButton
              confirmText={isThreadHidden ? "Unhide this thread?" : "Hide this thread from regular users?"}
              className="rounded border border-white/10 bg-white/5 px-3 py-2 text-xs opacity-80 hover:opacity-100"
            >
              {isThreadHidden ? "Unhide thread" : "Hide thread"}
            </ConfirmSubmitButton>
          </form>
        ) : null}
        {canLockThread ? (
          <form action={onToggleLock}>
            <ConfirmSubmitButton
              confirmText={isThreadLocked ? "Re-open this thread for replies?" : "Lock this thread for new replies?"}
              className="rounded border border-white/10 bg-white/5 px-3 py-2 text-xs opacity-80 hover:opacity-100"
            >
              {isThreadLocked ? "Unlock thread" : "Lock thread"}
            </ConfirmSubmitButton>
          </form>
        ) : null}
        {canDeleteThread && (
          <form action={onDelete}>
            <ConfirmSubmitButton
              confirmText="Delete this thread? This will remove all posts."
              className="rounded border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs opacity-80 hover:opacity-100"
            >
              Delete thread
            </ConfirmSubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}

function rethrowForumActionError(action: string, error: unknown): never {
  if (error instanceof ForumHttpError) {
    throw new Error(`Failed to ${action} (${error.status}): ${error.message}`);
  }
  throw error;
}

function toThreadPostDto(post: {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  markdown: string | null;
  likesCount?: number;
  likedByMe?: boolean;
  repCount?: number;
  repGivenByMe?: boolean;
  reportedByMe?: boolean;
  hiddenAt?: Date | null;
  hiddenById?: string | null;
  deletedAt?: Date | null;
  deletedById?: string | null;
  authorId: string;
  author: {
    id: string;
    username: string | null;
    profile: { displayName: string | null; avatarUrl: string | null } | null;
  } | null;
}) {
  return {
    id: post.id,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    markdown: post.markdown ?? "",
    likesCount: post.likesCount ?? 0,
    likedByMe: post.likedByMe ?? false,
    repCount: post.repCount ?? 0,
    repGivenByMe: post.repGivenByMe ?? false,
    reportedByMe: post.reportedByMe ?? false,
    hiddenAt: post.hiddenAt?.toISOString() ?? null,
    hiddenById: post.hiddenById ?? null,
    deletedAt: post.deletedAt?.toISOString() ?? null,
    deletedById: post.deletedById ?? null,
    authorId: post.authorId,
    author: post.author,
  };
}

async function getThread(
  category: string,
  slug: string,
  cursor?: string,
  includeHidden?: boolean,
  viewerId?: string | null
) {
  const data = await getThreadPostsByCategoryAndSlug({
    categorySlug: category,
    slug,
    take: 30,
    cursorId: cursor,
    includeHidden,
    viewerId,
  });
  if (!data) {
    return null;
  }

  return {
    posts: data.items,
    nextCursor: data.nextCursor,
    title: data.thread.title,
    threadAuthorId: data.thread.authorId,
    locked: data.thread.locked,
    hiddenAt: data.thread.hiddenAt?.toISOString() ?? null,
    hiddenById: data.thread.hiddenById ?? null,
  };
}

export default async function ThreadPage({ params, searchParams }: PageProps) {
  const { category, slug } = await params;
  const sp = await searchParams;
  const categorySlug = String(category);
  const threadSlug = String(slug);

  const { session, userId: me } = await getSessionViewer();

  const admin = isAdminSession(session);

  const { posts, nextCursor, title, threadAuthorId, locked, hiddenAt } = await getThread(
    categorySlug,
    threadSlug,
    sp?.cursor,
    admin,
    me,
  ) ?? notFound();
  const canDeleteThread = Boolean(
    me && (admin || (threadAuthorId && me === threadAuthorId))
  );
  const canModerateThread = admin;
  const canLockThread = Boolean(me && (admin || (threadAuthorId && me === threadAuthorId)));

  async function removePost(id: string) {
    "use server";
    try {
      const { session: nextSession, userId } = await getSessionViewer();
      if (!userId) throw Object.assign(new Error("Unauthorized"), { status: 401 });
      await deleteThreadPostForUser({
        postId: id,
        userId,
        isAdmin: Boolean(isAdminSession(nextSession)),
      });
    } catch (error) {
      rethrowForumActionError("delete post", error);
    }
  }

  async function toggleHiddenPost(id: string, hidden: boolean) {
    "use server";
    try {
      const { session: nextSession, userId } = await getSessionViewer();
      if (!userId) throw Object.assign(new Error("Unauthorized"), { status: 401 });
      await setThreadPostHiddenForAdmin({
        postId: id,
        userId,
        hidden,
        isAdmin: Boolean(isAdminSession(nextSession)),
      });
    } catch (error) {
      rethrowForumActionError(hidden ? "hide post" : "unhide post", error);
    }
  }

  async function toggleHiddenThread() {
    "use server";
    try {
      const { session: nextSession, userId } = await getSessionViewer();
      if (!userId) throw Object.assign(new Error("Unauthorized"), { status: 401 });
      await setThreadHiddenForAdmin({
        category: categorySlug,
        slug: threadSlug,
        userId,
        hidden: !hiddenAt,
        isAdmin: Boolean(isAdminSession(nextSession)),
      });
    } catch (error) {
      rethrowForumActionError(hiddenAt ? "unhide thread" : "hide thread", error);
    }

    revalidatePath(`/forum/${categorySlug}`);
    revalidatePath(`/forum/${categorySlug}/${threadSlug}`);
  }

  async function toggleLockThread() {
    "use server";
    try {
      const { session: nextSession, userId } = await getSessionViewer();
      if (!userId) throw Object.assign(new Error("Unauthorized"), { status: 401 });
      await setThreadLockedForUser({
        category: categorySlug,
        slug: threadSlug,
        userId,
        locked: !locked,
        isAdmin: Boolean(isAdminSession(nextSession)),
      });
    } catch (error) {
      rethrowForumActionError(locked ? "unlock thread" : "lock thread", error);
    }

    revalidatePath(`/forum/${categorySlug}`);
    revalidatePath(`/forum/${categorySlug}/${threadSlug}`);
  }

  async function send(formData: FormData) {
    "use server";

    const content = String(formData.get("content") || "");
    try {
      const { session: nextSession, userId } = await getSessionViewer();
      if (!userId) throw Object.assign(new Error("Unauthorized"), { status: 401 });
      const createdPost = await createThreadPostForUser({
        category: categorySlug,
        slug: threadSlug,
        userId,
        isAdmin: Boolean(isAdminSession(nextSession)),
        content,
      });
      return toThreadPostDto(createdPost);
    } catch (error) {
      rethrowForumActionError("reply", error);
    }
  }

  async function deleteThread() {
    "use server";
    try {
      const { session: nextSession, userId } = await getSessionViewer();
      if (!userId) throw Object.assign(new Error("Unauthorized"), { status: 401 });
      await deleteThreadForUser({
        category: categorySlug,
        slug: threadSlug,
        userId,
        isAdmin: Boolean(isAdminSession(nextSession)),
      });
    } catch (error) {
      rethrowForumActionError("delete thread", error);
    }

    revalidatePath(`/forum/${categorySlug}`);
    redirect(`/forum/${categorySlug}`);
  }

  return (
    <div className="space-y-6">
      <ThreadHeader
        category={categorySlug}
        title={title}
        canDeleteThread={canDeleteThread}
        canModerateThread={canModerateThread}
        canLockThread={canLockThread}
        isThreadLocked={Boolean(locked)}
        isThreadHidden={Boolean(hiddenAt)}
        onDelete={deleteThread}
        onToggleLock={toggleLockThread}
        onToggleHidden={toggleHiddenThread}
      />

      {admin && hiddenAt ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-400">
          This thread is hidden from regular users.
        </div>
      ) : null}

      {locked ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-400">
          This thread is locked for new replies.
        </div>
      ) : null}

      <ThreadInteractionClient
        category={categorySlug}
        slug={threadSlug}
        initialPosts={posts}
        initialNextCursor={nextCursor}
        meId={me ?? null}
        isAdmin={admin}
        isLocked={Boolean(locked)}
        threadAuthorId={threadAuthorId}
        removePostAction={removePost}
        toggleHiddenPostAction={toggleHiddenPost}
        sendAction={send}
      />

    </div>
  );
}
