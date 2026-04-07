import type { NextRequest } from "next/server";
import { getRouteErrorResponse, requireApiUserId } from "@/server/api";
import { json } from "@/server/http";
import { likeForumPostForUser, unlikeForumPostForUser } from "@/server/services/forum";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const userId = await requireApiUserId();
    const result = await likeForumPostForUser({ postId: id, userId });
    return json(result);
  } catch (routeError) {
    console.error("Failed to like forum post", routeError);
    return getRouteErrorResponse(routeError, "internal_error");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const userId = await requireApiUserId();
    const result = await unlikeForumPostForUser({ postId: id, userId });
    return json(result);
  } catch (routeError) {
    console.error("Failed to unlike forum post", routeError);
    return getRouteErrorResponse(routeError, "internal_error");
  }
}
