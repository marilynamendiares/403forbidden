// src/app/world/shop/page.tsx
import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import ShopClient from "./shop-client";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const session = await getServerSession(authOptions);
  const me =
    (session?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined);

  if (!me) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Shop</h1>
        <p className="mt-2 opacity-70">Please sign in.</p>
      </div>
    );
  }

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
    const alreadyOwned = ownedSet.has(it.id);
    const hasFunds = wallet.eurodollars >= it.priceEurodollars;
    const hasRep = wallet.reputationTotal >= it.requiredReputation;

    return {
      ...it,
      alreadyOwned,
      canBuy: !alreadyOwned && hasFunds && hasRep,
      lockedByFunds: !hasFunds,
      lockedByReputation: !hasRep,
    };
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <ShopClient initialItems={decorated} initialWallet={wallet} />
    </div>
  );
}
