CREATE TABLE "ForumPostReport" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ForumPostReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ForumPostReport_postId_reporterId_key" ON "ForumPostReport"("postId", "reporterId");
CREATE INDEX "ForumPostReport_createdAt_idx" ON "ForumPostReport"("createdAt" DESC);

ALTER TABLE "ForumPostReport"
ADD CONSTRAINT "ForumPostReport_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ForumPostReport"
ADD CONSTRAINT "ForumPostReport_reporterId_fkey"
FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
