import type { NextRequest } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/server/admin";
import { getSessionViewer } from "@/server/session";
import {
  deleteThreadForUser,
  setThreadHiddenForAdmin,
  setThreadLockedForUser,
} from "@/server/services/forum";
import { getRouteErrorResponse } from "@/server/api";
import { error, json, noContent } from "@/server/http";

type Ctx = { params: Promise<{ category: string; slug: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { category, slug } = await params;
  const { session, userId } = await getSessionViewer();
  if (!userId || !session) return error("unauthorized", 401);

  try {
    await deleteThreadForUser({
      category,
      slug,
      userId,
      isAdmin: Boolean(isAdminSession(session)),
    });
    return noContent();
  } catch (routeError) {
    console.error("Failed to delete thread", routeError);
    return getRouteErrorResponse(routeError, "internal_error");
  }
}

const PatchSchema = z
  .object({
    hidden: z.boolean().optional(),
    locked: z.boolean().optional(),
  })
  .refine((value) => value.hidden !== undefined || value.locked !== undefined, {
    message: "hidden_or_locked_required",
  })
  .refine((value) => !(value.hidden !== undefined && value.locked !== undefined), {
    message: "one_field_only",
  });

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { category, slug } = await params;
  const { session, userId } = await getSessionViewer();
  if (!userId || !session) return error("unauthorized", 401);

  try {
    const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json({ error: "Bad Request" }, { status: 400 });
    }

    const isAdmin = Boolean(isAdminSession(session));
    const result =
      parsed.data.hidden !== undefined
        ? await setThreadHiddenForAdmin({
            category,
            slug,
            userId,
            hidden: parsed.data.hidden,
            isAdmin,
          })
        : await setThreadLockedForUser({
            category,
            slug,
            userId,
            locked: Boolean(parsed.data.locked),
            isAdmin,
          });
    return json(result);
  } catch (routeError) {
    console.error("Failed to update thread moderation state", routeError);
    return getRouteErrorResponse(routeError, "internal_error");
  }
}
