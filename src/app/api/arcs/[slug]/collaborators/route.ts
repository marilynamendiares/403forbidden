// src/app/api/arcs/[slug]/collaborators/route.ts
import { z } from "zod";
import {
  addArcCollaboratorForOwner,
  listArcCollaboratorsForViewer,
  removeArcCollaboratorForOwner,
  updateArcCollaboratorRoleForOwner,
} from "@/server/services/arcs";
import { getRouteErrorResponse, requireApiUserId } from "@/server/api";
import { error, json, noContent } from "@/server/http";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const userId = await requireApiUserId();
    const { slug } = await ctx.params;
    const result = await listArcCollaboratorsForViewer({
      viewerUserId: userId,
      slug,
    });

    return json(result);
  } catch (routeError) {
    return getRouteErrorResponse(routeError);
  }
}

const AddSchema = z.object({
  identifier: z.string().trim().min(1),
  role: z.enum(["EDITOR", "VIEWER"]).default("EDITOR"),
});

export async function POST(req: Request, ctx: Ctx) {
  try {
    const ownerUserId = await requireApiUserId();
    const { slug } = await ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = AddSchema.safeParse(body);
    if (!parsed.success) return error("Bad Request", 400);

    const result = await addArcCollaboratorForOwner({
      ownerUserId,
      slug,
      identifier: parsed.data.identifier,
      role: parsed.data.role,
    });

    return json(result, { status: result.created ? 201 : 200 });
  } catch (routeError) {
    return getRouteErrorResponse(routeError);
  }
}

const PatchSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(["EDITOR", "VIEWER"]),
});

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const ownerUserId = await requireApiUserId();
    const { slug } = await ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return error("Bad Request", 400);

    const updated = await updateArcCollaboratorRoleForOwner({
      ownerUserId,
      slug,
      collaboratorUserId: parsed.data.userId,
      role: parsed.data.role,
    });

    return json(updated);
  } catch (routeError) {
    return getRouteErrorResponse(routeError);
  }
}

const DeleteSchema = z.object({
  userId: z.string().cuid(),
});

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const ownerUserId = await requireApiUserId();
    const { slug } = await ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) return error("Bad Request", 400);

    await removeArcCollaboratorForOwner({
      ownerUserId,
      slug,
      collaboratorUserId: parsed.data.userId,
    });

    return noContent();
  } catch (routeError) {
    return getRouteErrorResponse(routeError);
  }
}
