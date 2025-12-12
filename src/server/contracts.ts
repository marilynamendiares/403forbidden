// src/server/contracts.ts

/** ===== Shared DTOs ===== */

export type Cursor = { createdAt: string; id: string };
export type Paged<T> = { items: T[]; nextCursor: string | null };

export type AuthorDTO = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  email?: string | null;
};

export type ThreadDTO = {
  id: string;
  slug: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  author: AuthorDTO;
  _count: { posts: number };
};

export type CategoryDTO = {
  id: string;
  slug: string;
  title: string;
  desc: string | null;
  _count: { threads: number };
};

export type ChapterDTO = {
  id: string;
  index: number;
  title: string;
  markdown: string | null;
  isDraft: boolean;
  publishedAt: string | null;
  updatedAt: string;
  status: "OPEN" | "CLOSED" | null;
  book: { id: string; slug: string; title: string; ownerId: string };
  author: AuthorDTO & { email: string | null };
};

export type ChapterWithRightsDTO = ChapterDTO & {
  canEdit: boolean;
  canPost: boolean;
};

export type ChapterPostDTO = {
  id: string;
  contentMd: string;
  createdAt: string;
  editedAt: string | null;
  author: AuthorDTO;
};

/** ===== SSE events payloads ===== */

export type ThreadNewPost = {
  category: string;
  slug: string;
  threadId: string;
  postId: string;
  at: number;
};

export type ChapterNewPost = {
  slug: string;
  index: number;
  chapterId: string;
  post: {
    id: string;
    contentMd: string;
    createdAt: string;
    author: AuthorDTO;
  };
};

export type ChapterPostUpdated = {
  slug: string;
  index: number;
  chapterId: string;
  postId: string;
  contentMd: string;
  editedAt: string | null;
};

export type ChapterPostDeleted = {
  slug: string;
  index: number;
  chapterId: string;
  postId: string;
};
