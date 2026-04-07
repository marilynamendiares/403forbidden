// src/app/api/arcs/[slug]/chapters/[id]/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import {
  completeChapterForUser,
  reopenChapterForUser,
} from "@/server/services/chapters";
import { getRouteErrorResponse, requireApiUserId } from "@/server/api";
import { error, json } from "@/server/http";

type Ctx = { params: Promise<{ slug: string; id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { slug, id } = await params;
  const userId = await requireApiUserId();

  const body = (await req.json().catch(() => null)) as
    | { action?: "open" | "close" }
    | null;
  const action = body?.action;
  if (action !== "open" && action !== "close") {
    return error("Invalid action", 400);
  }

  try {
    const result =
      action === "open"
        ? await reopenChapterForUser({ userId, arcSlug: slug, chapterId: id })
        : await completeChapterForUser({ userId, arcSlug: slug, chapterId: id });

    if (!result.ok) return json(result, { status: 409 });
    return json({ ok: true, status: result.status });
  } catch (routeError) {
    return getRouteErrorResponse(routeError);
  }
}
