export const runtime = "nodejs";

import { type NextRequest } from "next/server";
import { z } from "zod";
import { getRouteErrorResponse, requireApiUserId } from "@/server/api";
import { error, json } from "@/server/http";
import {
  getCharacterApplicationForUser,
  updateCharacterApplicationForUser,
} from "@/server/services/characterApplications";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const me = await requireApiUserId();

  try {
    const row = await getCharacterApplicationForUser({ userId: me, id });
    return json({ item: row });
  } catch (routeError) {
    return getRouteErrorResponse(routeError, "internal_error");
  }
}

const PatchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  form: z.record(z.string(), z.any()).optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const me = await requireApiUserId();

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("bad_request", 400);

  try {
    const updated = await updateCharacterApplicationForUser({
      userId: me,
      id,
      name: parsed.data.name,
      form: parsed.data.form,
    });

    return json({ ok: true, item: updated });
  } catch (routeError) {
    return getRouteErrorResponse(routeError, "internal_error");
  }
}
