import { getSessionViewer } from "@/server/session";

export async function getViewerId() {
  const { userId } = await getSessionViewer();
  return userId;
}
