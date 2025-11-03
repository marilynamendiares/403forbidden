-- CreateEnum
CREATE TYPE "ChapterStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "Chapter" ADD COLUMN     "lastPostAt" TIMESTAMP(3),
ADD COLUMN     "status" "ChapterStatus" NOT NULL DEFAULT 'OPEN';

-- CreateTable
CREATE TABLE "ChapterPost" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "contentMd" TEXT NOT NULL,
    "contentHtml" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),

    CONSTRAINT "ChapterPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChapterPost_chapterId_createdAt_id_idx" ON "ChapterPost"("chapterId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "ChapterPost_authorId_idx" ON "ChapterPost"("authorId");

-- CreateIndex
CREATE INDEX "Chapter_lastPostAt_idx" ON "Chapter"("lastPostAt" DESC);

-- AddForeignKey
ALTER TABLE "ChapterPost" ADD CONSTRAINT "ChapterPost_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterPost" ADD CONSTRAINT "ChapterPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
