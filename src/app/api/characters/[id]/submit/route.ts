export const runtime = "nodejs";

import { type NextRequest } from "next/server";
import { getRouteErrorResponse, requireApiUserId } from "@/server/api";
import { json } from "@/server/http";
import { submitCharacterApplicationForUser } from "@/server/services/characterApplications";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const me = await requireApiUserId();

  try {
    const updated = await submitCharacterApplicationForUser({ userId: me, id });
    return json({ ok: true, item: updated });
  } catch (routeError) {
    return getRouteErrorResponse(routeError, "internal_error");
  }
}
