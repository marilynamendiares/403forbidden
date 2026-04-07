export const runtime = "nodejs";

import { type NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin";
import { getAuthSession } from "@/server/session";
import { getRouteErrorResponse } from "@/server/api";
import { error, json } from "@/server/http";
import { getCharacterApplicationForAdmin } from "@/server/services/characterApplications";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const session = await getAuthSession();
  try {
    requireAdmin(session);
  } catch {
    return error("forbidden", 403);
  }

  try {
    const item = await getCharacterApplicationForAdmin(id);
    return json({ item });
  } catch (routeError) {
    return getRouteErrorResponse(routeError, "internal_error");
  }
}
