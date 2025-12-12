// src/server/contracts/forum.ts
import { z } from "zod";

export const Author = z.object({
  id: z.string(),
  username: z.string().nullable(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export const ForumCategory = z.object({
  slug: z.string(),
  title: z.string(),
  desc: z.string().nullable(),
  _count: z.object({ threads: z.number() }),
});

export const ForumThread = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: Author,
  _count: z.object({ posts: z.number() }),
});

export const Page = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), nextCursor: z.string().nullable() });

export type AuthorT = z.infer<typeof Author>;
export type ForumCategoryT = z.infer<typeof ForumCategory>;
export type ForumThreadT = z.infer<typeof ForumThread>;
export type ThreadPageT = z.infer<ReturnType<typeof Page<typeof ForumThread>>>;
