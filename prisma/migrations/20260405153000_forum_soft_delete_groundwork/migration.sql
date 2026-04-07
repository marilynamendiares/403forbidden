ALTER TABLE "ForumThread"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedById" TEXT;

ALTER TABLE "ForumPost"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedById" TEXT;

CREATE INDEX "ForumThread_categoryId_deletedAt_lastActivityAt_id_idx"
ON "ForumThread"("categoryId", "deletedAt", "lastActivityAt", "id");

CREATE INDEX "ForumPost_threadId_deletedAt_createdAt_id_idx"
ON "ForumPost"("threadId", "deletedAt", "createdAt", "id");
