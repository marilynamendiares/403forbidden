// Canonical product contract for a single arc.
import { z } from "zod";
import {
  ArcFormat,
  ArcJoinPolicy,
  ArcSearchVisibility,
  ArcStatus,
  ArcVisibility,
} from "@prisma/client";
import { deleteArcForUser, updateArcForUser } from "@/server/services/books";
import { error, json, noContent } from "@/server/http";
import {
  getRouteErrorResponse,
  requireApiUserId,
  routeError,
} from "@/server/api";

export const runtime = "nodejs";

// ───────────────── helpers ─────────────────
async function getMe() {
  return requireApiUserId();
}

const UpdateArcSchema = z.object({
  intro: z.string().optional(),
  title: z.string().trim().min(2).max(120).optional(),
  tagline: z.string().trim().max(200).nullable().optional(),
  hook: z.string().trim().max(160).nullable().optional(),
  summary: z.string().trim().max(700).nullable().optional(),
  status: z.nativeEnum(ArcStatus).optional(),
  format: z.nativeEnum(ArcFormat).optional(),
  joinPolicy: z.nativeEnum(ArcJoinPolicy).optional(),
  visibility: z.nativeEnum(ArcVisibility).optional(),
  searchVisibility: z.nativeEnum(ArcSearchVisibility).optional(),
  allowDiscovery: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
});

// ───────────────── DELETE /api/arcs/[slug] ─────────────────
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const me = await getMe();
    const { slug } = await ctx.params;
    const deleted = await deleteArcForUser({ userId: me, slug });
    if (!deleted) throw routeError("Not found", 404);

    return noContent();
  } catch (e: unknown) {
    console.error("Failed to delete arc", e);
    return getRouteErrorResponse(e);
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const me = await getMe();
    const { slug } = await ctx.params;

    const parsed = UpdateArcSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return error("Bad Request", 400);

    if (Object.keys(parsed.data).length === 0) {
      return error("Nothing to update", 400);
    }

    const updated = await updateArcForUser({
      userId: me,
      slug,
      ...parsed.data,
    });

    return json(updated);
  } catch (e: unknown) {
    return getRouteErrorResponse(e);
  }
}
