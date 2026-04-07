ALTER TABLE "ForumPost"
ADD COLUMN "hiddenAt" TIMESTAMP(3),
ADD COLUMN "hiddenById" TEXT;

CREATE INDEX "ForumPost_threadId_hiddenAt_deletedAt_createdAt_id_idx"
ON "ForumPost"("threadId", "hiddenAt", "deletedAt", "createdAt", "id");
