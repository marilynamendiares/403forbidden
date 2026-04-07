// src/app/api/arcs/[slug]/[index]/posts/[postId]/reputation/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { z } from "zod";
import { grantChapterPostReputationForUser } from "@/server/services/chapters";
import {
  getRouteErrorResponse,
  parsePositiveIntParam,
  requireApiUserId,
} from "@/server/api";
import { error, json } from "@/server/http";

type Ctx = { params: Promise<{ slug: string; index: string; postId: string }> };

const GiveSchema = z.object({
  amount: z.number().int().min(1).max(1).default(1),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const { slug, index, postId } = await params;
  const idx = parsePositiveIntParam(index);
  if (!idx) return error("Bad index", 400);

  const me = await requireApiUserId();
  const body = await req.json().catch(() => null);
  const parsed = GiveSchema.safeParse(body ?? {});
  if (!parsed.success) return error("Bad Request", 400);

  try {
    const result = await grantChapterPostReputationForUser({
      slug,
      index: idx,
      postId,
      userId: me,
      amount: parsed.data.amount,
    });
    return json(result, { status: result.ok ? 200 : 409 });
  } catch (routeError) {
    return getRouteErrorResponse(routeError);
  }
}
