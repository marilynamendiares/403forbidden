// src/app/api/profile/[username]/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { getRouteErrorResponse } from "@/server/api";
import { error, json } from "@/server/http";
import { getPublicProfileByUsername } from "@/server/services/profileView";

type Ctx = { params: Promise<{ username: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { username } = await params;
  if (!username) return error("Missing username", 400);

  try {
    const payload = await getPublicProfileByUsername(username);
    return json(payload);
  } catch (routeError) {
    return getRouteErrorResponse(routeError);
  }
}
