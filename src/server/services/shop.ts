import { prisma } from "@/server/db";
import { recordWalletLedgerTx } from "@/server/economyLedger";

export class ShopHttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message = code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function buyShopItemForUser(input: {
  userId: string;
  itemId: string;
}) {
  const item = await prisma.shopItem.findUnique({
    where: { id: input.itemId },
    select: {
      id: true,
      isActive: true,
      priceEurodollars: true,
      requiredReputation: true,
    },
  });

  if (!item || !item.isActive) {
    throw new ShopHttpError(404, "NOT_FOUND", "Not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId: input.userId },
      create: { userId: input.userId },
      update: {},
      select: { eurodollars: true, reputationTotal: true },
    });

    if (wallet.reputationTotal < item.requiredReputation) {
      return { ok: false as const, error: "NOT_ENOUGH_REPUTATION" as const };
    }
    if (wallet.eurodollars < item.priceEurodollars) {
      return { ok: false as const, error: "NOT_ENOUGH_FUNDS" as const };
    }

    const already = await tx.inventoryItem.findFirst({
      where: { userId: input.userId, itemId: item.id },
      select: { id: true },
    });
    if (already) {
      return { ok: false as const, error: "ALREADY_OWNED" as const };
    }

    await tx.wallet.update({
      where: { userId: input.userId },
      data: { eurodollars: { decrement: item.priceEurodollars } },
    });

    const ownedItem = await tx.inventoryItem.create({
      data: { userId: input.userId, itemId: item.id },
    });

    await recordWalletLedgerTx(tx, {
      userId: input.userId,
      actorUserId: input.userId,
      kind: "shop.purchase",
      eurodollarsDelta: -item.priceEurodollars,
      balanceEurodollars: wallet.eurodollars - item.priceEurodollars,
      balanceReputationTotal: wallet.reputationTotal,
      targetType: "shop_item",
      targetId: item.id,
      note: ownedItem.id,
    });

    return {
      ok: true as const,
      wallet: {
        eurodollars: wallet.eurodollars - item.priceEurodollars,
        reputationTotal: wallet.reputationTotal,
      },
    };
  });

  return result;
}

export async function getShopForUser(userId: string) {
  const [wallet, items, owned] = await Promise.all([
    prisma.wallet.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { eurodollars: true, reputationTotal: true },
    }),
    prisma.shopItem.findMany({
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
    }),
    prisma.inventoryItem.findMany({
      where: { userId },
      select: { itemId: true },
    }),
  ]);

  const ownedSet = new Set(owned.map((item) => item.itemId));

  const decorated = items.map((item) => {
    const alreadyOwned = ownedSet.has(item.id);
    const hasFunds = wallet.eurodollars >= item.priceEurodollars;
    const hasRep = wallet.reputationTotal >= item.requiredReputation;

    return {
      ...item,
      alreadyOwned,
      canBuy: !alreadyOwned && hasFunds && hasRep,
      lockedByFunds: !hasFunds,
      lockedByReputation: !hasRep,
    };
  });

  return { wallet, items: decorated };
}

export async function getWalletEurodollars(userId: string) {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: { eurodollars: true },
  });

  return wallet?.eurodollars ?? 0;
}
