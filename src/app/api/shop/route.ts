// src/app/api/shop/route.ts
export const runtime = "nodejs";

import { requireSessionUserId } from "@/server/session";
import { error, json } from "@/server/http";
import { getShopForUser } from "@/server/services/shop";

export async function GET() {
  let me: string;
  try {
    me = await requireSessionUserId();
  } catch {
    return error("Unauthorized", 401);
  }

  const { wallet, items } = await getShopForUser(me);
  return json({ ok: true, wallet, items }, { status: 200 });
}
