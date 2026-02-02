/*
  Warnings:

  - A unique constraint covering the columns `[kind,entityType,entityId]` on the table `OutboxEvent` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "OutboxEvent" ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "claimedBy" TEXT;

-- CreateIndex
CREATE INDEX "OutboxEvent_status_createdAt_idx" ON "OutboxEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_claimedAt_idx" ON "OutboxEvent"("status", "claimedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_kind_entityType_entityId_key" ON "OutboxEvent"("kind", "entityType", "entityId");
