// src/app/api/arcs/[slug]/chapters/[id]/posts/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionViewer } from "@/server/session";
import {
  getChapterPostsByArcSlugAndChapterId,
  createChapterPostByArcSlugAndChapterId,
} from "@/server/repos/chapters";
import { drainOutbox } from "@/server/notify/queue";
import { requireApiUserId } from "@/server/api";
import { error, json } from "@/server/http";
import { createServerTimingCollector } from "@/server/observability";

type Ctx = { params: Promise<{ slug: string; id: string }> };

const PAGE_MAX = 100;

const CreatePostSchema = z.object({
  contentMd: z.string().trim().min(1, "Empty content").max(50_000),
});

export async function GET(req: NextRequest, { params }: Ctx) {
  const timing = createServerTimingCollector();
  const { slug, id } = await params;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || "50"), PAGE_MAX);
  const cursor = searchParams.get("cursor") || null;
  const { userId: viewerId } = await getSessionViewer();

  const result = await timing.measure(
    "chapter_post_slice",
    () =>
      getChapterPostsByArcSlugAndChapterId({
        slug,
        chapterId: id,
        limit,
        cursor,
        viewerId,
      }),
    "chapter posts slice fetch"
  );
  if (!result) return error("Not found", 404);

  return json(
    { items: result.items, nextCursor: result.nextCursor },
    { headers: timing.toHeaders() }
  );
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const timing = createServerTimingCollector();
  const { slug, id } = await params;
  const userId = await timing.measure(
    "viewer_session",
    () => requireApiUserId(),
    "api user resolve"
  );
  const parsed = CreatePostSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Bad Request", 400);

  const dto = await timing.measure(
    "chapter_post_create",
    () =>
      createChapterPostByArcSlugAndChapterId({
        slug,
        chapterId: id,
        userId,
        contentMd: parsed.data.contentMd,
      }),
    "chapter post create"
  );

  if (process.env.NODE_ENV !== "production") {
    await drainOutbox({ limit: 100 });
  }

  return json(
    { ok: true, post: dto },
    { status: 201, headers: timing.toHeaders() }
  );
}
