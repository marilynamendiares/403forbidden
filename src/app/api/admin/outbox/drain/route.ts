import { drainOutbox } from "@/server/notify/queue";
import { requireAdmin } from "@/server/admin";
import { getSessionViewer } from "@/server/session";
import { getRouteErrorResponse } from "@/server/api";
import { error, json } from "@/server/http";

export async function POST() {
  try {
    const { session } = await getSessionViewer();
    requireAdmin(session);

    const result = await drainOutbox({ limit: 200 });
    return json(result);
  } catch (routeError) {
    const status =
      routeError &&
      typeof routeError === "object" &&
      "status" in routeError &&
      typeof routeError.status === "number"
        ? routeError.status
        : 500;

    if (status === 403) {
      return error("forbidden", 403);
    }

    console.error("[outbox] drain error", routeError);
    return getRouteErrorResponse(routeError, "failed to drain outbox");
  }
}
