// src/app/api/arcs/[slug]/chapters/[id]/close/route.ts
import { NextRequest } from "next/server";
import { completeChapterForUser } from "@/server/services/chapters";
import { getRouteErrorResponse, requireApiUserId } from "@/server/api";
import { json } from "@/server/http";

type Ctx = { params: Promise<{ slug: string; id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { slug, id } = await params;
  const userId = await requireApiUserId();

  try {
    const result = await completeChapterForUser({
      userId,
      arcSlug: slug,
      chapterId: id,
    });

    return json({
      success: true,
      status: result.status,
      awardedEurodollars: result.awardedEurodollars,
    });
  } catch (routeError) {
    return getRouteErrorResponse(routeError);
  }
}
