import { getRouteErrorResponse } from "@/server/api";
import { requireAdmin } from "@/server/admin";
import { json } from "@/server/http";
import { getSessionViewer } from "@/server/session";
import { searchAdminUsers } from "@/server/services/adminControl";

export async function GET(req: Request) {
  try {
    const { session } = await getSessionViewer();
    requireAdmin(session);

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") ?? "";

    const items = await searchAdminUsers(query);
    return json({ items });
  } catch (routeError) {
    console.error("Failed to search admin users", routeError);
    return getRouteErrorResponse(routeError, "internal_error");
  }
}
