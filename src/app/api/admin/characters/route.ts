// src/app/api/admin/characters/route.ts
export const runtime = "nodejs";

import { requireAdmin } from "@/server/admin";
import { getAuthSession } from "@/server/session";
import { listCharacterApplicationsForAdmin } from "@/server/services/characterApplications";
import { error, json } from "@/server/http";

export async function GET() {
  const session = await getAuthSession();
  try {
    requireAdmin(session);
  } catch {
    return error("forbidden", 403);
  }

  const result = await listCharacterApplicationsForAdmin();
  return json(result);
}
