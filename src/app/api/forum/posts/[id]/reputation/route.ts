import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRouteErrorResponse, requireApiUserId } from "@/server/api";
import { json } from "@/server/http";
import { grantForumPostReputationForUser } from "@/server/services/forum";

type Ctx = { params: Promise<{ id: string }> };

const BodySchema = z.object({
  amount: z.number().int().min(1).max(1).default(1),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const userId = await requireApiUserId();
    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json({ error: "bad_request" }, { status: 400 });
    }

    const result = await grantForumPostReputationForUser({
      postId: id,
      userId,
      amount: parsed.data.amount,
    });
    return json(result);
  } catch (routeError) {
    console.error("Failed to grant forum post reputation", routeError);
    return getRouteErrorResponse(routeError, "internal_error");
  }
}
