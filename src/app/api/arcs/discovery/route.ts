import { getArcsDiscovery } from "@/server/repos/arcs";
import { getViewerId } from "@/server/authViewer";
import { json } from "@/server/http";

export async function GET() {
  const viewerId = await getViewerId();
  const result = await getArcsDiscovery(viewerId);
  return json(result);
}
