"use client";

import { useState } from "react";
import { ChapterPostList } from "@/components/chapter/ChapterPostList";
import { ChapterComposer } from "@/components/chapter/ChapterComposer";
import type { ChapterPostListItem } from "@/lib/chapterPostsClient";

type Props = {
  slug: string;
  index: number | string;
  currentUserId?: string | null;
  disabled?: boolean;
  nextChapterIndex?: number | null;
  initialItems: ChapterPostListItem[];
  initialNextCursor?: string | null;
};

export function ChapterPostsSectionClient({
  slug,
  index,
  currentUserId,
  disabled,
  nextChapterIndex,
  initialItems,
  initialNextCursor = null,
}: Props) {
  const [optimisticPost, setOptimisticPost] = useState<ChapterPostListItem | null>(null);

  return (
    <>
      <ChapterPostList
        slug={slug}
        index={index}
        currentUserId={currentUserId}
        initialItems={initialItems}
        initialNextCursor={initialNextCursor}
        optimisticPost={optimisticPost}
      />
      <ChapterComposer
        slug={slug}
        index={index}
        disabled={disabled}
        nextChapterIndex={nextChapterIndex}
        onPosted={(post) => setOptimisticPost(post)}
      />
    </>
  );
}
