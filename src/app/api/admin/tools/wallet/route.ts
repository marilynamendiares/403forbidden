import { z } from "zod";
import { requireAdmin } from "@/server/admin";
import { getSessionViewer } from "@/server/session";
import { getRouteErrorResponse } from "@/server/api";
import { json } from "@/server/http";
import { adjustUserWalletForAdmin } from "@/server/services/adminControl";

const BodySchema = z.object({
  username: z.string().trim().min(1).max(64),
  eurodollarsDelta: z.number().int().optional(),
  reputationDelta: z.number().int().optional(),
});

export async function POST(req: Request) {
  try {
    const { session, userId } = await getSessionViewer();
    requireAdmin(session);

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json({ error: "bad_request" }, { status: 400 });
    }

    const result = await adjustUserWalletForAdmin({
      ...parsed.data,
      actorUserId: userId ?? undefined,
    });
    return json(result);
  } catch (routeError) {
    console.error("Failed to apply admin wallet tool", routeError);
    return getRouteErrorResponse(routeError, "internal_error");
  }
}
