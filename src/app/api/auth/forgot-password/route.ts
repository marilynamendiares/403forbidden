export const runtime = "nodejs";

import { getRouteErrorResponse } from "@/server/api";
import { error, json } from "@/server/http";
import { sendPasswordResetCode } from "@/server/services/authFlow";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").toLowerCase().trim();
  if (!email) return error("bad_request", 400);

  try {
    const result = await sendPasswordResetCode(email);
    return json(result);
  } catch (routeError) {
    return getRouteErrorResponse(routeError, "internal_error");
  }
}
