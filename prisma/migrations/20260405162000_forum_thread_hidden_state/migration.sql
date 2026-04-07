ALTER TABLE "ForumThread"
ADD COLUMN "hiddenAt" TIMESTAMP(3),
ADD COLUMN "hiddenById" TEXT;

CREATE INDEX "ForumThread_categoryId_hiddenAt_deletedAt_lastActivityAt_id_idx"
ON "ForumThread"("categoryId", "hiddenAt", "deletedAt", "lastActivityAt", "id");
