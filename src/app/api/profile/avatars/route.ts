export const runtime = "nodejs";

import { getRouteErrorResponse, requireApiUserId } from "@/server/api";
import { error, json, noContent } from "@/server/http";
import {
  deleteUserAvatarForUser,
  listUserAvatarsForUser,
} from "@/server/services/profile";

export async function GET() {
  const userId = await requireApiUserId();
  return json({
    items: await listUserAvatarsForUser(userId),
  });
}

export async function DELETE(req: Request) {
  const userId = await requireApiUserId();
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return error("Missing id", 400);

  try {
    await deleteUserAvatarForUser({ userId, avatarId: id });
    return noContent();
  } catch (routeError) {
    return getRouteErrorResponse(routeError);
  }
}
