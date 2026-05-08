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
import { withRouteObservability } from "@/server/observability";

type Ctx = { params: Promise<{ category: string; slug: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return withRouteObservability(async (timing) => {
    const { category, slug } = await timing.measure(
      "route_params",
      () => params,
      "route params resolve"
    );
    const { session, userId } = await timing.measure(
      "viewer_session",
      () => getSessionViewer(),
      "session viewer resolve"
    );
    if (!userId || !session) return error("unauthorized", 401);

    try {
      await timing.measure(
        "forum_thread_delete",
        () =>
          deleteThreadForUser({
            category,
            slug,
            userId,
            isAdmin: Boolean(isAdminSession(session)),
          }),
        "forum thread delete"
      );
      return noContent();
    } catch (routeError) {
      console.error("Failed to delete thread", routeError);
      return getRouteErrorResponse(routeError, "internal_error");
    }
  });
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
  return withRouteObservability(async (timing) => {
    const { category, slug } = await timing.measure(
      "route_params",
      () => params,
      "route params resolve"
    );
    const { session, userId } = await timing.measure(
      "viewer_session",
      () => getSessionViewer(),
      "session viewer resolve"
    );
    if (!userId || !session) return error("unauthorized", 401);

    try {
      const body = await timing.measure(
        "request_json",
        () => req.json().catch(() => null),
        "request body parse"
      );
      const parsed = PatchSchema.safeParse(body);
      if (!parsed.success) {
        return json({ error: "Bad Request" }, { status: 400 });
      }

      const isAdmin = Boolean(isAdminSession(session));
      const result =
        parsed.data.hidden !== undefined
          ? await timing.measure(
              "forum_thread_hide",
              () =>
                setThreadHiddenForAdmin({
                  category,
                  slug,
                  userId,
                  hidden: parsed.data.hidden ?? false,
                  isAdmin,
                }),
              "forum thread hidden toggle"
            )
          : await timing.measure(
              "forum_thread_lock",
              () =>
                setThreadLockedForUser({
                  category,
                  slug,
                  userId,
                  locked: Boolean(parsed.data.locked),
                  isAdmin,
                }),
              "forum thread lock toggle"
            );
      return json(result);
    } catch (routeError) {
      console.error("Failed to update thread moderation state", routeError);
      return getRouteErrorResponse(routeError, "internal_error");
    }
  });
}
