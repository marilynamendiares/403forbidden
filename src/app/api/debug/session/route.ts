import { getAuthSession } from "@/server/session";
import { json } from "@/server/http";

export async function GET() {
  const session = await getAuthSession();
  return json(session ?? null);
}
