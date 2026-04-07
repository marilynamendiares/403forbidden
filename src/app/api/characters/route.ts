export const runtime = "nodejs";

import { type NextRequest } from "next/server";
import { z } from "zod";
import { getRouteErrorResponse, requireApiUserId } from "@/server/api";
import { error, json } from "@/server/http";
import {
  createCharacterApplicationForUser,
  listCharacterApplicationsForUser,
} from "@/server/services/characterApplications";

export async function GET() {
  const me = await requireApiUserId();
  const items = await listCharacterApplicationsForUser(me);
  return json({ items });
}

const CreateSchema = z.object({
  name: z.string().min(2).max(80),
});

export async function POST(req: NextRequest) {
  const me = await requireApiUserId();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("bad_request", 400);

  const name = parsed.data.name.trim();
  if (name.length < 2) return error("bad_request", 400);

  try {
    const row = await createCharacterApplicationForUser({ userId: me, name });
    return json({ ok: true, id: row.id });
  } catch (routeError) {
    return getRouteErrorResponse(routeError, "internal_error");
  }
}
