-- Align forum post indexing with the actual stable cursor strategy (threadId, createdAt, id).
DROP INDEX IF EXISTS "ForumPost_threadId_createdAt_idx";
CREATE INDEX "ForumPost_threadId_createdAt_id_idx" ON "ForumPost"("threadId", "createdAt", "id");
