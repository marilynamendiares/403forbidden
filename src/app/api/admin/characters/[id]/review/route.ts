export const runtime = "nodejs";

import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/server/admin";
import { getSessionViewer } from "@/server/session";
import { getRouteErrorResponse } from "@/server/api";
import { error, json } from "@/server/http";
import { reviewCharacterApplication } from "@/server/services/characterApplications";

type Ctx = { params: Promise<{ id: string }> };

const BodySchema = z.object({
  action: z.enum(["APPROVE", "NEEDS_CHANGES"]),
  note: z.string().max(5000).optional(),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { session, userId: moderatorId } = await getSessionViewer();

  try {
    requireAdmin(session);
  } catch {
    return error("forbidden", 403);
  }
  if (!moderatorId) return error("forbidden", 403);

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("bad_request", 400);

  try {
    const updated = await reviewCharacterApplication({
      id,
      moderatorId,
      action: parsed.data.action,
      note: parsed.data.note,
    });

    return json({ ok: true, item: updated });
  } catch (routeError) {
    return getRouteErrorResponse(routeError, "internal_error");
  }
}
