// src/app/api/arcs/[slug]/[index]/posts/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  createChapterPost,
  getChapterPostsWithInteractions,
} from "@/server/repos/chapters";
import { getSessionViewer } from "@/server/session";
import { drainOutbox } from "@/server/notify/queue";
import {
  parsePositiveIntParam,
  requireApiUserId,
} from "@/server/api";
import { error, json } from "@/server/http";

type Ctx = { params: Promise<{ slug: string; index: string }> };

const PAGE_MAX = 100;

export async function GET(req: NextRequest, { params }: Ctx) {
  const { slug, index } = await params;
  const idx = parsePositiveIntParam(index);
  if (!idx) return error("Bad index", 400);

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || "50"), PAGE_MAX);
  const cursor = searchParams.get("cursor") || null;
  const { userId: me } = await getSessionViewer();

  const { items, nextCursor } = await getChapterPostsWithInteractions({
    slug,
    index: idx,
    limit,
    cursor,
    viewerId: me,
  });

  return json({ items, nextCursor });
}

const CreatePostSchema = z.object({
  contentMd: z.string().trim().min(1, "Empty content").max(50_000),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const { slug, index } = await params;
  const idx = parsePositiveIntParam(index);
  if (!idx) return error("Bad index", 400);

  const userId = await requireApiUserId();
  const parsed = CreatePostSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Bad Request", 400);

  const dto = await createChapterPost({
    slug,
    index: idx,
    userId,
    contentMd: parsed.data.contentMd,
  });

  if (process.env.NODE_ENV !== "production") {
    await drainOutbox({ limit: 100 });
  }

  return json({ ok: true, post: dto }, { status: 201 });
}
