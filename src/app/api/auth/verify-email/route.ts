export const runtime = "nodejs";

import { getRouteErrorResponse } from "@/server/api";
import { error, json } from "@/server/http";
import { verifyEmailCode } from "@/server/services/authFlow";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").toLowerCase().trim();
  const code = String(body?.code ?? "").trim();
  if (!email || code.length < 4) return error("bad_request", 400);

  try {
    const result = await verifyEmailCode({ email, code });
    return json(result);
  } catch (routeError) {
    return getRouteErrorResponse(routeError, "internal_error");
  }
}
