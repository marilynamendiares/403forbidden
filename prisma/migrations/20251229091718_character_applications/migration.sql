-- CreateEnum
CREATE TYPE "CharacterAppStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CHANGES', 'APPROVED');

-- CreateTable
CREATE TABLE "CharacterApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "form" JSONB NOT NULL,
    "status" "CharacterAppStatus" NOT NULL DEFAULT 'DRAFT',
    "moderatorId" TEXT,
    "moderatorNote" TEXT,
    "lastSubmittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CharacterApplication_userId_status_updatedAt_idx" ON "CharacterApplication"("userId", "status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "CharacterApplication_status_updatedAt_idx" ON "CharacterApplication"("status", "updatedAt" DESC);

-- AddForeignKey
ALTER TABLE "CharacterApplication" ADD CONSTRAINT "CharacterApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
