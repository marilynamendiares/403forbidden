"use client";

import ReplyFormClient from "@/components/ReplyFormClient";
import ThreadPostsClient from "@/features/forum/ui/ThreadPostsClient";
import { emitForumThreadPostCreated } from "@/lib/forumThreadPostEvents";
import type { ThreadPost } from "@/features/forum/ui/useThreadRealtimePosts";

type Props = {
  category: string;
  slug: string;
  initialPosts: ThreadPost[];
  initialNextCursor: string | null;
  meId: string | null;
  isAdmin: boolean;
  isLocked: boolean;
  threadAuthorId: string | null;
  removePostAction: (id: string) => Promise<void>;
  toggleHiddenPostAction: (id: string, hidden: boolean) => Promise<void>;
  sendAction: (formData: FormData) => Promise<ThreadPost | null>;
};

function ThreadReplyGate({
  me,
  isLocked,
  isAdmin,
  action,
  onSubmitted,
}: {
  me: string | null;
  isLocked: boolean;
  isAdmin: boolean;
  action: (formData: FormData) => Promise<ThreadPost | null>;
  onSubmitted: (post: ThreadPost | null) => void;
}) {
  if (isLocked && !isAdmin) {
    return (
      <div className="rounded-xl border border-neutral-800 p-4 text-sm opacity-70">
        This thread is locked for new replies.
      </div>
    );
  }

  if (me) {
    return (
      <ReplyFormClient
        action={async (formData) => {
          const createdPost = await action(formData);
          onSubmitted(createdPost);
        }}
      />
    );
  }

  return (
    <div className="rounded-xl border border-neutral-800 p-4 text-sm opacity-70">
      Sign in to reply.
    </div>
  );
}

export default function ThreadInteractionClient({
  category,
  slug,
  initialPosts,
  initialNextCursor,
  meId,
  isAdmin,
  isLocked,
  threadAuthorId,
  removePostAction,
  toggleHiddenPostAction,
  sendAction,
}: Props) {
  return (
    <>
      <ThreadPostsClient
        category={category}
        slug={slug}
        initialPosts={initialPosts}
        initialNextCursor={initialNextCursor}
        meId={meId}
        isAdmin={isAdmin}
        threadAuthorId={threadAuthorId}
        removePostAction={removePostAction}
        toggleHiddenPostAction={toggleHiddenPostAction}
      />

      <ThreadReplyGate
        me={meId}
        isLocked={isLocked}
        isAdmin={isAdmin}
        action={sendAction}
        onSubmitted={(post) => {
          if (!post) return;
          emitForumThreadPostCreated({
            category,
            slug,
            post,
          });
        }}
      />
    </>
  );
}
