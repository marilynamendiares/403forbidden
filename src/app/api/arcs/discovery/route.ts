import { getArcsDiscovery } from "@/server/repos/arcs";
import { getViewerId } from "@/server/authViewer";
import { json } from "@/server/http";
import { withRouteObservability } from "@/server/observability";

export async function GET() {
  return withRouteObservability(async (timing) => {
    const viewerId = await timing.measure(
      "viewer_session",
      () => getViewerId(),
      "viewer id resolve"
    );
    const result = await timing.measure(
      "arcs_discovery",
      () => getArcsDiscovery(viewerId),
      "arcs discovery fetch"
    );
    return json(result);
  });
}
