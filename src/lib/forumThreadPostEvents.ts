"use client";

import type { ThreadPost } from "@/features/forum/ui/useThreadRealtimePosts";

const forumThreadPostCreatedEventName = "forum-thread-post-created";

type ForumThreadPostCreatedDetail = {
  category: string;
  slug: string;
  post: ThreadPost;
};

export function emitForumThreadPostCreated(detail: ForumThreadPostCreatedDetail) {
  window.dispatchEvent(
    new CustomEvent<ForumThreadPostCreatedDetail>(forumThreadPostCreatedEventName, {
      detail,
    })
  );
}

export function listenForumThreadPostCreated(
  listener: (detail: ForumThreadPostCreatedDetail) => void
) {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<ForumThreadPostCreatedDetail>).detail;
    if (!detail) return;
    listener(detail);
  };

  window.addEventListener(forumThreadPostCreatedEventName, handler);
  return () => window.removeEventListener(forumThreadPostCreatedEventName, handler);
}
