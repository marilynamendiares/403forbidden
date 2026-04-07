// src/app/api/arcs/[slug]/[index]/posts/[postId]/like/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import {
  likeChapterPostForUser,
  unlikeChapterPostForUser,
} from "@/server/services/chapters";
import {
  getRouteErrorResponse,
  parsePositiveIntParam,
  requireApiUserId,
} from "@/server/api";
import { error, json } from "@/server/http";

type Ctx = { params: Promise<{ slug: string; index: string; postId: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { slug, index, postId } = await params;
  const idx = parsePositiveIntParam(index);
  if (!idx) return error("Bad index", 400);

  const me = await requireApiUserId();
  try {
    const result = await likeChapterPostForUser({
      slug,
      index: idx,
      postId,
      userId: me,
    });
    return json(result);
  } catch (routeError) {
    return getRouteErrorResponse(routeError);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { slug, index, postId } = await params;
  const idx = parsePositiveIntParam(index);
  if (!idx) return error("Bad index", 400);

  const me = await requireApiUserId();
  try {
    const result = await unlikeChapterPostForUser({
      slug,
      index: idx,
      postId,
      userId: me,
    });
    return json(result);
  } catch (routeError) {
    return getRouteErrorResponse(routeError);
  }
}
