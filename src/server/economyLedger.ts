import type { Prisma } from "@prisma/client";

export async function recordWalletLedgerTx(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    actorUserId?: string | null;
    kind: string;
    eurodollarsDelta?: number;
    reputationDelta?: number;
    balanceEurodollars?: number | null;
    balanceReputationTotal?: number | null;
    targetType?: string | null;
    targetId?: string | null;
    note?: string | null;
  }
) {
  const walletLedger = (tx as Prisma.TransactionClient & {
    walletLedger: {
      create: (args: {
        data: {
          userId: string;
          actorUserId: string | null;
          kind: string;
          eurodollarsDelta: number;
          reputationDelta: number;
          balanceEurodollars: number | null;
          balanceReputationTotal: number | null;
          targetType: string | null;
          targetId: string | null;
          note: string | null;
        };
      }) => Promise<unknown>;
    };
  }).walletLedger;

  return walletLedger.create({
    data: {
      userId: input.userId,
      actorUserId: input.actorUserId ?? null,
      kind: input.kind,
      eurodollarsDelta: Math.trunc(input.eurodollarsDelta ?? 0),
      reputationDelta: Math.trunc(input.reputationDelta ?? 0),
      balanceEurodollars: input.balanceEurodollars ?? null,
      balanceReputationTotal: input.balanceReputationTotal ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      note: input.note ?? null,
    },
  });
}
