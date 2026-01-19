// src/app/api/world/shop/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const me =
    (session?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined);

  if (!me) return new Response("Unauthorized", { status: 401 });

  const wallet = await prisma.wallet.upsert({
    where: { userId: me },
    create: { userId: me },
    update: {},
    select: { eurodollars: true, reputationTotal: true },
  });

  const items = await prisma.shopItem.findMany({
    where: { isActive: true },
    orderBy: [{ requiredReputation: "asc" }, { priceEurodollars: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      category: true,
      priceEurodollars: true,
      requiredReputation: true,
    },
  });

  const owned = await prisma.inventoryItem.findMany({
    where: { userId: me },
    select: { itemId: true },
  });
  const ownedSet = new Set(owned.map((x) => x.itemId));

  const decorated = items.map((it) => {
    const hasFunds = wallet.eurodollars >= it.priceEurodollars;
    const hasRep = wallet.reputationTotal >= it.requiredReputation;
    const alreadyOwned = ownedSet.has(it.id);
    return {
      ...it,
      alreadyOwned,
      canBuy: !alreadyOwned && hasFunds && hasRep,
      lockedByReputation: !hasRep,
      lockedByFunds: !hasFunds,
    };
  });

  return Response.json({ ok: true, wallet, items: decorated }, { status: 200 });
}
