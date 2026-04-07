"use client";

import { Heart, Star } from "lucide-react";
import Markdown from "@/components/Markdown";
import UserBadge from "@/components/UserBadge";
import { timeAgo } from "@/lib/TimeAgo";
import type { ThreadPost } from "@/features/forum/ui/useThreadRealtimePosts";

export function ForumThreadPostCard({
  post,
  meId,
  isAdmin,
  reported,
  reportPending,
  reportConfirmed,
  threadAuthorId,
  onDelete,
  onReport,
  onToggleHidden,
  onToggleLike,
  onGiveReputation,
}: {
  post: ThreadPost;
  meId: string | null;
  isAdmin: boolean;
  reported: boolean;
  reportPending: boolean;
  reportConfirmed: boolean;
  threadAuthorId: string | null;
  onDelete: (id: string) => Promise<void>;
  onReport: (id: string) => Promise<void>;
  onToggleHidden: (id: string, hidden: boolean) => Promise<void>;
  onToggleLike: (id: string, nextLiked: boolean) => Promise<void>;
  onGiveReputation: (id: string) => Promise<void>;
}) {
  const hiddenAtLabel = post.hiddenAt ? new Date(post.hiddenAt).toLocaleString() : null;
  const deletedAtLabel = post.deletedAt ? new Date(post.deletedAt).toLocaleString() : null;
  const deletedByLabel =
    post.deletedById && post.deletedById === post.authorId ? "author" : "moderator";
  const canDelete =
    !post.deletedAt &&
    !!meId &&
    (meId === post.authorId || (isAdmin && threadAuthorId !== null));
  const canReport =
    !isAdmin &&
    !post.deletedAt &&
    !post.hiddenAt &&
    !!meId &&
    meId !== post.authorId;
  const canReact =
    !!meId &&
    !post.deletedAt &&
    !post.hiddenAt &&
    meId !== post.authorId;
  const hiddenByLabel = post.hiddenById ? "moderator" : null;

  return (
    <li className="rounded-xl border border-neutral-800 p-4">
      <div className="mb-2 flex items-center justify-between">
        <UserBadge
          href={`/u/${encodeURIComponent(post.author?.username ?? "user")}`}
          avatar={post.author?.profile?.avatarUrl ?? null}
          username={post.author?.username ?? "user"}
          displayName={post.author?.profile?.displayName ?? null}
          size={24}
        />
        <time className="text-xs opacity-60" suppressHydrationWarning>
          {timeAgo(post.createdAt)}
        </time>
      </div>

      {post.deletedAt ? (
        <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-400">
          <div>This post was deleted.</div>
          {isAdmin ? (
            <div className="mt-2 text-xs text-neutral-500">
              Deleted by {deletedByLabel}
              {deletedAtLabel ? ` · ${deletedAtLabel}` : ""}
            </div>
          ) : null}
        </div>
      ) : post.hiddenAt ? (
        <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-400">
          <div>This post is hidden.</div>
          {isAdmin ? (
            <div className="mt-2 text-xs text-neutral-500">
              Hidden by {hiddenByLabel}
              {hiddenAtLabel ? ` · ${hiddenAtLabel}` : ""}
            </div>
          ) : null}
        </div>
      ) : (
        <Markdown>{post.markdown ?? ""}</Markdown>
      )}

      {canDelete || isAdmin ? (
        <div className="flex items-center gap-3 pt-2">
          {canDelete ? (
            <form action={onDelete.bind(null, post.id)}>
              <button type="submit" className="text-xs opacity-70 underline hover:opacity-100">
                Delete
              </button>
            </form>
          ) : null}
          {isAdmin && !post.deletedAt ? (
            <form action={onToggleHidden.bind(null, post.id, !post.hiddenAt)}>
              <button type="submit" className="text-xs opacity-70 underline hover:opacity-100">
                {post.hiddenAt ? "Unhide" : "Hide"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {!canDelete && canReport ? (
        <div className="flex items-center gap-3 pt-2">
          <form action={onReport.bind(null, post.id)}>
            <button
              type="submit"
              disabled={reported || reportPending}
              className="text-xs opacity-70 underline hover:opacity-100 disabled:cursor-default disabled:opacity-40"
            >
              {reportPending ? "Reporting..." : reported ? "Reported" : "Report"}
            </button>
          </form>
          {reportConfirmed ? <span className="text-xs opacity-60">Sent to admins.</span> : null}
        </div>
      ) : null}

      {!post.deletedAt && !post.hiddenAt ? (
        <div className="flex items-center gap-4 pt-3 text-neutral-500">
          <button
            type="button"
            disabled={!canReact}
            className={[
              "inline-flex items-center gap-1 transition",
              !canReact ? "cursor-not-allowed opacity-40" : "hover:text-[#2D2D2D]",
            ].join(" ")}
            title={
              !canReact
                ? meId === post.authorId
                  ? "You cannot react to your own post"
                  : "Sign in to react"
                : post.likedByMe
                  ? "Remove like"
                  : "Like"
            }
            onClick={() => {
              void onToggleLike(post.id, !post.likedByMe);
            }}
          >
            <Heart
              className={["h-4 w-4", post.likedByMe || post.likesCount > 0 ? "text-[#B24B56]" : ""].join(" ")}
              fill={post.likedByMe || post.likesCount > 0 ? "currentColor" : "none"}
            />
            <span className="tabular-nums text-xs">{post.likesCount}</span>
          </button>

          <button
            type="button"
            disabled={!canReact || post.repGivenByMe}
            className={[
              "inline-flex items-center gap-1 transition",
              !canReact || post.repGivenByMe
                ? "cursor-not-allowed opacity-40"
                : "hover:text-[#2D2D2D]",
            ].join(" ")}
            title={
              !canReact
                ? meId === post.authorId
                  ? "You cannot react to your own post"
                  : "Sign in to react"
                : post.repGivenByMe
                  ? "Reputation already given"
                  : "Give reputation (+1)"
            }
            onClick={() => {
              void onGiveReputation(post.id);
            }}
          >
            <Star
              className={["h-4 w-4", post.repGivenByMe || post.repCount > 0 ? "text-[#B89A42]" : ""].join(" ")}
              fill={post.repGivenByMe || post.repCount > 0 ? "currentColor" : "none"}
            />
            <span className="tabular-nums text-xs">{post.repCount}</span>
          </button>
        </div>
      ) : null}
    </li>
  );
}

export function ForumThreadLoadMoreButton({
  nextCursor,
  loading,
  onLoadMore,
}: {
  nextCursor: string | null;
  loading: boolean;
  onLoadMore: () => void;
}) {
  if (!nextCursor) return null;

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={onLoadMore}
        disabled={loading}
        className="rounded bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
      >
        {loading ? "Loading..." : "Load more posts"}
      </button>
    </div>
  );
}
