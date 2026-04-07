// src/app/api/forum/posts/[id]/route.ts
import type { NextRequest } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/server/admin";
import {
  deleteThreadPostForUser,
  reportThreadPostForUser,
  setThreadPostHiddenForAdmin,
} from "@/server/services/forum";
import { getRouteErrorResponse, requireApiUserId } from "@/server/api";
import { getSessionViewer } from "@/server/session";
import { json, noContent } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const { session } = await getSessionViewer();
    const userId = await requireApiUserId();
    await deleteThreadPostForUser({
      postId: id,
      userId,
      isAdmin: Boolean(isAdminSession(session)),
    });
    return noContent();
  } catch (routeError) {
    console.error("Failed to delete forum post", routeError);
    return getRouteErrorResponse(routeError);
  }
}

const PatchSchema = z.object({
  hidden: z.boolean(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json({ error: "Bad Request" }, { status: 400 });
    }

    const { session } = await getSessionViewer();
    const userId = await requireApiUserId();
    const result = await setThreadPostHiddenForAdmin({
      postId: id,
      userId,
      hidden: parsed.data.hidden,
      isAdmin: Boolean(isAdminSession(session)),
    });
    return json(result);
  } catch (routeError) {
    console.error("Failed to update forum post moderation state", routeError);
    return getRouteErrorResponse(routeError);
  }
}

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const userId = await requireApiUserId();
    const result = await reportThreadPostForUser({
      postId: id,
      userId,
    });
    return json(result, { status: result.alreadyReported ? 200 : 201 });
  } catch (routeError) {
    console.error("Failed to report forum post", routeError);
    return getRouteErrorResponse(routeError);
  }
}
