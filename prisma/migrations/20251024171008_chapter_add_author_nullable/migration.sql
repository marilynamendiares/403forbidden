-- AlterTable
ALTER TABLE "Chapter" ADD COLUMN     "authorId" TEXT;

-- CreateIndex
CREATE INDEX "Chapter_authorId_idx" ON "Chapter"("authorId");

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
