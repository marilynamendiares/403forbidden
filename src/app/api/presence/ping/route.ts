// src/app/api/presence/ping/route.ts
import { requireApiUserId } from "@/server/api";
import { error, json } from "@/server/http";
import { listOnlineUserIds, recordPresencePing } from "@/server/services/presence";
import { createServerTimingCollector } from "@/server/observability";

export const dynamic = "force-dynamic";

export async function POST() {
  const timing = createServerTimingCollector();
  try {
    const userId = await timing.measure(
      "viewer_session",
      () => requireApiUserId(),
      "api user resolve"
    );
    await timing.measure(
      "presence_ping",
      () => recordPresencePing(userId),
      "presence heartbeat"
    );
    const onlineUserIds = await timing.measure(
      "presence_online_list",
      () => listOnlineUserIds(),
      "online user ids fetch"
    );
    return json({ ok: true, onlineUserIds }, { headers: timing.toHeaders() });
  } catch {
    return error("Unauthorized", 401);
  }
}
