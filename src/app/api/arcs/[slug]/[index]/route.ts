// src/app/api/arcs/[slug]/[index]/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionViewer } from "@/server/session";
import { getChapterBySlugIndex } from "@/server/repos/chapters";
import {
  deleteChapterForUser,
  updateChapterForUser,
} from "@/server/services/chapters";
import {
  getRouteErrorResponse,
  parsePositiveIntParam,
  requireApiUserId,
} from "@/server/api";
import { error, json } from "@/server/http";
import { withRouteObservability } from "@/server/observability";

type Ctx = { params: Promise<{ slug: string; index: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  return withRouteObservability(async (timing) => {
    const { slug, index } = await timing.measure(
      "route_params",
      () => params,
      "route params resolve"
    );
    const idx = parsePositiveIntParam(index);
    if (!idx) return error("Bad index", 400);

    const { userId: me } = await timing.measure(
      "viewer_session",
      () => getSessionViewer(),
      "session viewer resolve"
    );
    const chapter = await timing.measure(
      "chapter_read",
      () => getChapterBySlugIndex({ slug, index: idx, viewerId: me }),
      "chapter screen fetch"
    );
    if (!chapter) return error("Not found", 404);

    return json({
      arc: { title: chapter.arc.title, slug: chapter.arc.slug },
      chapter: {
        id: chapter.id,
        index: chapter.index,
        title: chapter.title,
        markdown: chapter.markdown ?? "",
        isDraft: chapter.isDraft,
        publishedAt: chapter.publishedAt,
        updatedAt: chapter.updatedAt,
        status: chapter.status,
      },
      author: {
        id: chapter.author.id,
        username: chapter.author.username,
        displayName: chapter.author.displayName,
        email: chapter.author.email,
      },
      canEdit: chapter.canEdit,
    });
  });
}

const UpdateSchema = z.object({
  title: z.string().min(2).max(140).optional(),
  content: z.string().min(1).optional(),
  publish: z.boolean().optional(),
  status: z.enum(["OPEN", "CLOSED"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return withRouteObservability(async (timing) => {
    const { slug, index } = await timing.measure(
      "route_params",
      () => params,
      "route params resolve"
    );
    const body = await timing.measure(
      "request_json",
      () => req.json().catch(() => null),
      "request body parse"
    );
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return error("Bad Request", 400);

    const data = parsed.data;
    if (
      data.title === undefined &&
      data.content === undefined &&
      data.publish === undefined &&
      data.status === undefined
    ) {
      return error("Nothing to update", 400);
    }

    const me = await timing.measure(
      "viewer_session",
      () => requireApiUserId(),
      "api user resolve"
    );
    const idx = parsePositiveIntParam(index);
    if (!idx) return error("Bad index", 400);

    if (data.publish !== undefined || data.status !== undefined) {
      return error("Forbidden", 403);
    }

    try {
      const updated = await timing.measure(
        "chapter_update",
        () =>
          updateChapterForUser({
            userId: me,
            slug,
            index: idx,
            title: data.title,
            content: data.content,
          }),
        "chapter update"
      );
      return json(updated);
    } catch (routeError) {
      return getRouteErrorResponse(routeError);
    }
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return withRouteObservability(async (timing) => {
    const { slug, index } = await timing.measure(
      "route_params",
      () => params,
      "route params resolve"
    );
    const me = await timing.measure(
      "viewer_session",
      () => requireApiUserId(),
      "api user resolve"
    );
    const idx = parsePositiveIntParam(index);
    if (!idx) return error("Bad index", 400);

    try {
      const result = await timing.measure(
        "chapter_delete",
        () =>
          deleteChapterForUser({
            userId: me,
            slug,
            index: idx,
          }),
        "chapter delete"
      );
      return json(result);
    } catch (routeError) {
      return getRouteErrorResponse(routeError);
    }
  });
}
