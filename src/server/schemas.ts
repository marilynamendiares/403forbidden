// src/server/schemas.ts
import { z } from "zod";

export const CreateCategory = z.object({
  title: z.string().trim().min(2).max(64),
  desc: z.string().trim().max(300).optional(),
});

export const CreateThread = z.object({
  title: z.string().trim().min(2).max(140),
  content: z.string().trim().min(1).max(20_000),
});

export const CreateChapterPost = z.object({
  contentMd: z.string().trim().min(1, "Empty content").max(50_000),
});

export const PatchChapterPost = z.object({
  contentMd: z.string().trim().min(1).max(50_000),
});
