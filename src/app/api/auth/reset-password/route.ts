export const runtime = "nodejs";

import { getRouteErrorResponse } from "@/server/api";
import { error, json } from "@/server/http";
import { resetPasswordWithCode } from "@/server/services/authFlow";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").toLowerCase().trim();
  const code = String(body?.code ?? "").trim();
  const newPassword = String(body?.newPassword ?? "");
  if (!email || !code || newPassword.length < 6) return error("bad_request", 400);

  try {
    const result = await resetPasswordWithCode({ email, code, newPassword });
    return json(result);
  } catch (routeError) {
    return getRouteErrorResponse(routeError, "internal_error");
  }
}
