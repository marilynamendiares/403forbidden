// src/app/api/arcs/[slug]/chapters/[id]/open/route.ts
import { NextRequest } from "next/server";
import { reopenChapterForUser } from "@/server/services/chapters";
import { getRouteErrorResponse, requireApiUserId } from "@/server/api";
import { json } from "@/server/http";

type Ctx = { params: Promise<{ slug: string; id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { slug, id } = await params;
  const userId = await requireApiUserId();

  try {
    const result = await reopenChapterForUser({
      userId,
      arcSlug: slug,
      chapterId: id,
    });

    if (!result.ok) {
      return json(
        {
          error: "Not enough eurodollars",
          code: result.error,
          eurodollars: result.eurodollars,
          required: result.required,
        },
        { status: 409 }
      );
    }

    return json({
      success: true,
      status: result.status,
      penaltyEurodollars: result.penaltyEurodollars,
    });
  } catch (routeError) {
    return getRouteErrorResponse(routeError);
  }
}
