CREATE TABLE "WalletLedger" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "kind" TEXT NOT NULL,
  "eurodollarsDelta" INTEGER NOT NULL DEFAULT 0,
  "reputationDelta" INTEGER NOT NULL DEFAULT 0,
  "balanceEurodollars" INTEGER,
  "balanceReputationTotal" INTEGER,
  "targetType" TEXT,
  "targetId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WalletLedger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WalletLedger_createdAt_idx"
ON "WalletLedger"("createdAt" DESC);

CREATE INDEX "WalletLedger_userId_createdAt_idx"
ON "WalletLedger"("userId", "createdAt" DESC);

CREATE INDEX "WalletLedger_kind_createdAt_idx"
ON "WalletLedger"("kind", "createdAt" DESC);

ALTER TABLE "WalletLedger"
ADD CONSTRAINT "WalletLedger_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
