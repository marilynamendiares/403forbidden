ALTER TABLE "ForumThread"
ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "ForumThread" t
SET "lastActivityAt" = COALESCE(
  (
    SELECT MAX(p."createdAt")
    FROM "ForumPost" p
    WHERE p."threadId" = t."id"
  ),
  t."createdAt"
);

DROP INDEX IF EXISTS "ForumThread_categoryId_createdAt_idx";
CREATE INDEX "ForumThread_categoryId_lastActivityAt_id_idx"
ON "ForumThread"("categoryId", "lastActivityAt", "id");
