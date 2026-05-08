import { getUnreadCount } from "@/server/services/notifications";
import { getSessionViewer } from "@/server/session";
import { json } from "@/server/http";
import { withRouteObservability } from "@/server/observability";

export async function GET() {
  return withRouteObservability(async (timing) => {
    const { userId } = await timing.measure(
      "viewer_session",
      () => getSessionViewer(),
      "session viewer resolve"
    );
    if (!userId) return json({ count: 0 });

    const count = await timing.measure(
      "notifications_count",
      () => getUnreadCount(userId),
      "unread notifications count"
    );

    return json({ count });
  });
}
