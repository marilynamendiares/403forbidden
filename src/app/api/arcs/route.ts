// Legacy alias route. Canonical product contract is /api/arcs.
import type { NextRequest } from "next/server";
import { z } from "zod";
import { listArcs, createArc } from "@/server/services/arcs";
import { isPlayer } from "@/server/player";
import { getRouteErrorResponse, requireApiUserId } from "@/server/api";
import { error, json } from "@/server/http";

// GET /api/arcs — public discovery-facing list
export async function GET() {
  const arcs = await listArcs();
  return json(arcs);
}

// POST /api/arcs — create arc
const CreateSchema = z.object({
  title: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(200).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const userId = await requireApiUserId();
    if (!(await isPlayer(userId))) {
      return error("PLAYER_REQUIRED", 403);
    }

    const body = await req.json().catch(() => null);
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return error("Bad Request", 400);

    const created = await createArc({
      userId,
      title: parsed.data.title,
      tagline: parsed.data.tagline ?? null,
    });

    return json(created, { status: 201 });
  } catch (routeError) {
    return getRouteErrorResponse(routeError, "Cannot create arc");
  }
}
