// src/app/api/arcs/[slug]/[index]/publish/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { publishChapterForUser } from "@/server/services/chapters";
import {
  getRouteErrorResponse,
  parsePositiveIntParam,
  requireApiUserId,
} from "@/server/api";
import { error, json } from "@/server/http";

type Ctx = { params: Promise<{ slug: string; index: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { slug, index } = await params;
  const userId = await requireApiUserId();
  const idx = parsePositiveIntParam(index);
  if (!idx) return error("Bad index", 400);

  try {
    const result = await publishChapterForUser({ userId, slug, index: idx });
    return json(result);
  } catch (routeError) {
    return getRouteErrorResponse(routeError);
  }
}
