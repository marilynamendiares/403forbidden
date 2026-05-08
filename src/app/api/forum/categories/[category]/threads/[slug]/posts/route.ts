// src/app/api/forum/categories/[category]/threads/[slug]/posts/route.ts
import {
  getThreadPostsAfterByCategoryAndSlug,
  getThreadPostsByCategoryAndSlug,
} from "@/server/repos/forum";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { isAdminSession } from "@/server/admin";
import { createThreadPostForUser } from "@/server/services/forum";
import { getSessionViewer } from "@/server/session";
import { getRouteErrorResponse } from "@/server/api";
import { error, json } from "@/server/http";
import { withRouteObservability } from "@/server/observability";

type Ctx = { params: Promise<{ category: string; slug: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return withRouteObservability(async (timing) => {
    const { category, slug } = await timing.measure(
      "route_params",
      () => params,
      "route params resolve"
    );
    const { session, userId } = await timing.measure(
      "viewer_session",
      () => getSessionViewer(),
      "session viewer resolve"
    );
    const includeHidden = Boolean(isAdminSession(session));
    const url = new URL(req.url);
    const take = Math.min(Number(url.searchParams.get("take") ?? 30), 100);
    const afterCreatedAt = url.searchParams.get("afterCreatedAt");
    const afterId = url.searchParams.get("afterId");
    const cursor = url.searchParams.get("cursor") ?? undefined;

    if (afterCreatedAt) {
      const afterDate = new Date(afterCreatedAt);
      if (Number.isNaN(afterDate.getTime())) {
        return error("bad_afterCreatedAt", 400);
      }

      const result = await timing.measure(
        "forum_tail_read",
        () =>
          getThreadPostsAfterByCategoryAndSlug({
            categorySlug: category,
            slug,
            afterCreatedAt: afterDate,
            afterId,
            take,
            includeHidden,
            viewerId: userId,
          }),
        "forum thread tail fetch"
      );

      if (!result) return error("thread_not_found", 404);
      return json({ items: result.items, nextCursor: null });
    }

    const data = await timing.measure(
      "forum_slice_read",
      () =>
        getThreadPostsByCategoryAndSlug({
          categorySlug: category,
          slug,
          take,
          cursorId: cursor,
          includeHidden,
          viewerId: userId,
        }),
      "forum thread slice fetch"
    );
    if (!data) return error("thread_not_found", 404);

    return json({ items: data.items, nextCursor: data.nextCursor });
  });
}

const CreatePost = z.object({
  content: z.string().trim().min(1).max(20_000),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  return withRouteObservability(async (timing) => {
    const { category, slug } = await timing.measure(
      "route_params",
      () => params,
      "route params resolve"
    );
    const { session, userId } = await timing.measure(
      "viewer_session",
      () => getSessionViewer(),
      "session viewer resolve"
    );
    if (!userId || !session) return error("unauthorized", 401);

    const body = await timing.measure(
      "request_json",
      () => req.json().catch(() => null),
      "request body parse"
    );
    const parsed = CreatePost.safeParse(body);
    if (!parsed.success) return error("bad_request", 400);

    try {
      const post = await timing.measure(
        "forum_post_create",
        () =>
          createThreadPostForUser({
            category,
            slug,
            userId,
            isAdmin: Boolean(isAdminSession(session)),
            content: parsed.data.content,
          }),
        "forum thread reply create"
      );
      return json(post, { status: 201 });
    } catch (routeError) {
      console.error("Failed to create thread post", routeError);
      return getRouteErrorResponse(routeError, "internal_error");
    }
  });
}
