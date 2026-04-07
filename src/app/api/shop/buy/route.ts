// src/app/api/shop/buy/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUserId } from "@/server/session";
import { error, json } from "@/server/http";
import { buyShopItemForUser, ShopHttpError } from "@/server/services/shop";

const BuySchema = z.object({
  itemId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let me: string;
  try {
    me = await requireSessionUserId();
  } catch {
    return error("Unauthorized", 401);
  }

  const body = await req.json().catch(() => null);
  const parsed = BuySchema.safeParse(body);
  if (!parsed.success) return error("Bad Request", 400);

  try {
    const result = await buyShopItemForUser({
      userId: me,
      itemId: parsed.data.itemId,
    });

    if (!result.ok) {
      return json({ ok: false, error: result.error }, { status: 409 });
    }

    return json({ ok: true, wallet: result.wallet }, { status: 200 });
  } catch (error) {
    if (error instanceof ShopHttpError) {
      return errorResponse(error.message, error.status);
    }
    return errorResponse("Internal error", 500);
  }
}

function errorResponse(message: string, status: number) {
  return error(message, status);
}
