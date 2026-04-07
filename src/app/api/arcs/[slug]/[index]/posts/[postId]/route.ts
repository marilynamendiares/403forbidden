// src/app/api/arcs/[slug]/[index]/posts/[postId]/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  deleteChapterPostForUser,
  updateChapterPostForUser,
} from "@/server/services/chapters";
import {
  getRouteErrorResponse,
  parsePositiveIntParam,
  requireApiUserId,
} from "@/server/api";
import { error, json } from "@/server/http";

type Ctx = { params: Promise<{ slug: string; index: string; postId: string }> };

const PatchSchema = z.object({
  contentMd: z.string().min(1).max(50_000),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { slug, index, postId } = await params;
  const idx = parsePositiveIntParam(index);
  if (!idx) return error("Bad index", 400);

  const me = await requireApiUserId();
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return error("Bad Request", 400);

  try {
    const result = await updateChapterPostForUser({
      slug,
      index: idx,
      postId,
      userId: me,
      content: parsed.data.contentMd,
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
    const result = await deleteChapterPostForUser({
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
