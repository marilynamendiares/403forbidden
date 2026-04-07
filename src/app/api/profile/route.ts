// src/app/api/profile/route.ts
export const runtime = "nodejs";

import { z } from "zod";
import { getRouteErrorResponse, requireApiUserId } from "@/server/api";
import { error, json } from "@/server/http";
import {
  getMyProfile,
  updateMyProfile,
} from "@/server/services/profileView";

const PatchSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(64),
  bio: z.string().trim().max(1000).optional(),
  avatarUrl: z.string().trim().max(2048).optional(),
  bannerUrl: z.string().trim().max(2048).optional(),
});

export async function GET() {
  try {
    const userId = await requireApiUserId();
    const profile = await getMyProfile(userId);
    return json(profile);
  } catch (routeError) {
    return getRouteErrorResponse(routeError);
  }
}

export async function PATCH(req: Request) {
  const userId = await requireApiUserId();

  const body = await req.json().catch(() => null);
  if (body === null) return error("Bad JSON", 400);

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.issues.map((issue) => issue.message).join(", "), 400);
  }

  try {
    const updated = await updateMyProfile({
      userId,
      displayName: parsed.data.displayName,
      bio: parsed.data.bio,
      avatarUrl: parsed.data.avatarUrl,
      bannerUrl: parsed.data.bannerUrl,
    });
    return json(updated);
  } catch (routeError) {
    return getRouteErrorResponse(routeError, "Could not save profile");
  }
}
