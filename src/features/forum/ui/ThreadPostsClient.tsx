"use client";

import { useEffect, useState } from "react";
import {
  useThreadRealtimePosts,
  type ThreadPost as Post,
} from "@/features/forum/ui/useThreadRealtimePosts";
import {
  ForumThreadLoadMoreButton,
  ForumThreadPostCard,
} from "@/features/forum/ui/ForumThreadUi";
import { fetchForumThreadPostsPage } from "@/lib/forumThreadPostsClient";
import { listenForumThreadPostCreated } from "@/lib/forumThreadPostEvents";
import { reportForumPost } from "@/lib/forumModerationClient";
import {
  grantForumPostReputation,
  toggleForumPostLike,
} from "@/lib/forumPostInteractionsClient";

type Props = {
  category: string;
  slug: string;
  initialPosts: Post[];
  initialNextCursor: string | null;
  meId: string | null;
  isAdmin: boolean;
  threadAuthorId: string | null;
  removePostAction: (id: string) => Promise<void>;
  toggleHiddenPostAction: (id: string, hidden: boolean) => Promise<void>;
};

export default function ThreadPostsClient({
  category,
  slug,
  initialPosts,
  initialNextCursor,
  meId,
  isAdmin,
  threadAuthorId,
  removePostAction,
  toggleHiddenPostAction,
}: Props) {
  const { posts, appendPosts, patchPost } = useThreadRealtimePosts({
    category,
    slug,
    initialPosts,
  });
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reportedIds, setReportedIds] = useState<Set<string>>(
    () => new Set(initialPosts.filter((post) => post.reportedByMe).map((post) => post.id))
  );
  const [pendingReportIds, setPendingReportIds] = useState<Set<string>>(() => new Set());
  const [confirmedReportIds, setConfirmedReportIds] = useState<Set<string>>(() => new Set());

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);

    try {
      const payload = await fetchForumThreadPostsPage({
        category,
        slug,
        cursor: nextCursor,
        take: 30,
      });

      appendPosts(Array.isArray(payload?.items) ? payload.items : []);
      setNextCursor(payload?.nextCursor ?? null);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    return listenForumThreadPostCreated((detail) => {
      if (detail.category !== category || detail.slug !== slug) return;
      appendPosts([detail.post]);
    });
  }, [appendPosts, category, slug]);

  async function reportPost(id: string) {
    if (reportedIds.has(id) || pendingReportIds.has(id)) return;

    setPendingReportIds((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });

    try {
      const result = await reportForumPost(id);
      if (result.ok || result.status === 409) {
        setReportedIds((current) => {
          const next = new Set(current);
          next.add(id);
          return next;
        });
        setConfirmedReportIds((current) => {
          const next = new Set(current);
          next.add(id);
          return next;
        });
        patchPost(id, (post) => ({ ...post, reportedByMe: true }));
      }
    } finally {
      setPendingReportIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  async function toggleLike(id: string, nextLiked: boolean) {
    const previous = posts.find((post) => post.id === id);
    if (!previous) return;

    patchPost(id, (post) => ({
      ...post,
      likedByMe: nextLiked,
      likesCount: Math.max(0, post.likesCount + (nextLiked ? 1 : -1)),
    }));

    try {
      const result = await toggleForumPostLike({ postId: id, nextLiked });
      patchPost(id, (post) => ({
        ...post,
        likedByMe: result.liked ?? nextLiked,
        likesCount: typeof result.likesCount === "number" ? result.likesCount : post.likesCount,
      }));
    } catch {
      patchPost(id, () => previous);
    }
  }

  async function giveReputation(id: string) {
    const previous = posts.find((post) => post.id === id);
    if (!previous || previous.repGivenByMe) return;

    patchPost(id, (post) => ({
      ...post,
      repGivenByMe: true,
      repCount: post.repCount + 1,
    }));

    try {
      const result = await grantForumPostReputation({ postId: id, amount: 1 });
      patchPost(id, (post) => ({
        ...post,
        repGivenByMe: true,
        repCount: typeof result.repCount === "number" ? result.repCount : post.repCount,
      }));
    } catch {
      patchPost(id, () => previous);
    }
  }

  return (
    <>
      <ul className="grid gap-3">
        {posts.map((p) => (
          <ForumThreadPostCard
            key={p.id}
            post={p}
            meId={meId}
            isAdmin={isAdmin}
            reported={reportedIds.has(p.id)}
            reportPending={pendingReportIds.has(p.id)}
            reportConfirmed={confirmedReportIds.has(p.id)}
            threadAuthorId={threadAuthorId}
            onDelete={removePostAction}
            onReport={reportPost}
            onToggleHidden={toggleHiddenPostAction}
            onToggleLike={toggleLike}
            onGiveReputation={giveReputation}
          />
        ))}
        {posts.length === 0 && <p className="opacity-60">No posts yet.</p>}
      </ul>

      <ForumThreadLoadMoreButton
        nextCursor={nextCursor}
        loading={loadingMore}
        onLoadMore={() => {
          void loadMore();
        }}
      />
    </>
  );
}
