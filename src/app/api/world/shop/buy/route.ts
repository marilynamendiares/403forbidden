// src/app/api/world/shop/buy/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { z } from "zod";

const BuySchema = z.object({
  itemId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const me =
    (session?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined);

  if (!me) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = BuySchema.safeParse(body);
  if (!parsed.success) return new Response("Bad Request", { status: 400 });

  const item = await prisma.shopItem.findUnique({
    where: { id: parsed.data.itemId },
    select: {
      id: true,
      isActive: true,
      priceEurodollars: true,
      requiredReputation: true,
    },
  });

  if (!item || !item.isActive) return new Response("Not found", { status: 404 });

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId: me },
      create: { userId: me },
      update: {},
      select: { eurodollars: true, reputationTotal: true },
    });

    if (wallet.reputationTotal < item.requiredReputation) {
      return { ok: false as const, error: "NOT_ENOUGH_REPUTATION" as const, wallet };
    }
    if (wallet.eurodollars < item.priceEurodollars) {
      return { ok: false as const, error: "NOT_ENOUGH_FUNDS" as const, wallet };
    }

    // уникально: один раз купить
    const already = await tx.inventoryItem.findFirst({
      where: { userId: me, itemId: item.id },
      select: { id: true },
    });
    if (already) {
      return { ok: false as const, error: "ALREADY_OWNED" as const, wallet };
    }

    await tx.wallet.update({
      where: { userId: me },
      data: { eurodollars: { decrement: item.priceEurodollars } },
    });

    await tx.inventoryItem.create({
      data: { userId: me, itemId: item.id },
    });

    const newWallet = await tx.wallet.findUnique({
      where: { userId: me },
      select: { eurodollars: true, reputationTotal: true },
    });

    return { ok: true as const, wallet: newWallet };
  });

  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 409 });
  }

  return Response.json({ ok: true, wallet: result.wallet }, { status: 200 });
}
