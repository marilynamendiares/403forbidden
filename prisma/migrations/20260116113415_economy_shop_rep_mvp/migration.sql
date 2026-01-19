-- CreateTable
CREATE TABLE "Wallet" (
    "userId" TEXT NOT NULL,
    "eurodollars" INTEGER NOT NULL DEFAULT 0,
    "reputationTotal" INTEGER NOT NULL DEFAULT 0,
    "reputationBudget" INTEGER NOT NULL DEFAULT 10,
    "reputationBudgetMax" INTEGER NOT NULL DEFAULT 10,
    "reputationBudgetResetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "priceEurodollars" INTEGER NOT NULL DEFAULT 0,
    "requiredReputation" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChapterPostLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChapterPostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChapterPostReputationGrant" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChapterPostReputationGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopItem_slug_key" ON "ShopItem"("slug");

-- CreateIndex
CREATE INDEX "InventoryItem_userId_createdAt_idx" ON "InventoryItem"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_userId_itemId_key" ON "InventoryItem"("userId", "itemId");

-- CreateIndex
CREATE INDEX "ChapterPostLike_postId_createdAt_idx" ON "ChapterPostLike"("postId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ChapterPostLike_userId_postId_key" ON "ChapterPostLike"("userId", "postId");

-- CreateIndex
CREATE INDEX "ChapterPostReputationGrant_toUserId_createdAt_idx" ON "ChapterPostReputationGrant"("toUserId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ChapterPostReputationGrant_fromUserId_postId_key" ON "ChapterPostReputationGrant"("fromUserId", "postId");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShopItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterPostLike" ADD CONSTRAINT "ChapterPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterPostLike" ADD CONSTRAINT "ChapterPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ChapterPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterPostReputationGrant" ADD CONSTRAINT "ChapterPostReputationGrant_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterPostReputationGrant" ADD CONSTRAINT "ChapterPostReputationGrant_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterPostReputationGrant" ADD CONSTRAINT "ChapterPostReputationGrant_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ChapterPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
