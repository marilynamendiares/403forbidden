import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  return Response.json(session ?? null);
}
