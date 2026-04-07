CREATE TABLE "ForumPostLike" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ForumPostLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ForumPostLike_userId_postId_key"
ON "ForumPostLike"("userId", "postId");

CREATE INDEX "ForumPostLike_postId_createdAt_idx"
ON "ForumPostLike"("postId", "createdAt" DESC);

ALTER TABLE "ForumPostLike"
ADD CONSTRAINT "ForumPostLike_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ForumPostLike"
ADD CONSTRAINT "ForumPostLike_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ForumPostReputationGrant" (
  "id" TEXT NOT NULL,
  "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ForumPostReputationGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ForumPostReputationGrant_fromUserId_postId_key"
ON "ForumPostReputationGrant"("fromUserId", "postId");

CREATE INDEX "ForumPostReputationGrant_toUserId_createdAt_idx"
ON "ForumPostReputationGrant"("toUserId", "createdAt" DESC);

ALTER TABLE "ForumPostReputationGrant"
ADD CONSTRAINT "ForumPostReputationGrant_fromUserId_fkey"
FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ForumPostReputationGrant"
ADD CONSTRAINT "ForumPostReputationGrant_toUserId_fkey"
FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ForumPostReputationGrant"
ADD CONSTRAINT "ForumPostReputationGrant_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
