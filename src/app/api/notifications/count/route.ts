import { getUnreadCount } from "@/server/services/notifications";
import { getSessionViewer } from "@/server/session";
import { json } from "@/server/http";
import { createServerTimingCollector } from "@/server/observability";

export async function GET() {
  const timing = createServerTimingCollector();
  const { userId } = await timing.measure(
    "viewer_session",
    () => getSessionViewer(),
    "session viewer resolve"
  );
  if (!userId) return json({ count: 0 }, { headers: timing.toHeaders() });

  const count = await timing.measure(
    "notifications_count",
    () => getUnreadCount(userId),
    "unread notifications count"
  );

  return json({ count }, { headers: timing.toHeaders() });
}
