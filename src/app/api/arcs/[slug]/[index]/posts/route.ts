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
import { withRouteObservability } from "@/server/observability";

type Ctx = { params: Promise<{ slug: string; index: string }> };

const PAGE_MAX = 100;

export async function GET(req: NextRequest, { params }: Ctx) {
  return withRouteObservability(async (timing) => {
    const { slug, index } = await timing.measure(
      "route_params",
      () => params,
      "route params resolve"
    );
    const idx = parsePositiveIntParam(index);
    if (!idx) return error("Bad index", 400);

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || "50"), PAGE_MAX);
    const cursor = searchParams.get("cursor") || null;
    const { userId: me } = await timing.measure(
      "viewer_session",
      () => getSessionViewer(),
      "session viewer resolve"
    );

    const { items, nextCursor } = await timing.measure(
      "chapter_post_slice",
      () =>
        getChapterPostsWithInteractions({
          slug,
          index: idx,
          limit,
          cursor,
          viewerId: me,
        }),
      "chapter posts slice fetch"
    );

    return json({ items, nextCursor });
  });
}

const CreatePostSchema = z.object({
  contentMd: z.string().trim().min(1, "Empty content").max(50_000),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  return withRouteObservability(async (timing) => {
    const { slug, index } = await timing.measure(
      "route_params",
      () => params,
      "route params resolve"
    );
    const idx = parsePositiveIntParam(index);
    if (!idx) return error("Bad index", 400);

    const userId = await timing.measure(
      "viewer_session",
      () => requireApiUserId(),
      "api user resolve"
    );
    const body = await timing.measure(
      "request_json",
      () => req.json().catch(() => null),
      "request body parse"
    );
    const parsed = CreatePostSchema.safeParse(body);
    if (!parsed.success) return error("Bad Request", 400);

    const dto = await timing.measure(
      "chapter_post_create",
      () =>
        createChapterPost({
          slug,
          index: idx,
          userId,
          contentMd: parsed.data.contentMd,
        }),
      "chapter post create"
    );

    if (process.env.NODE_ENV !== "production") {
      await timing.measure(
        "outbox_drain",
        () => drainOutbox({ limit: 100 }),
        "dev outbox drain"
      );
    }

    return json({ ok: true, post: dto }, { status: 201 });
  });
}
