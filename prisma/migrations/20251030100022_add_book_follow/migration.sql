-- CreateTable
CREATE TABLE "BookFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookFollow_bookId_createdAt_idx" ON "BookFollow"("bookId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookFollow_userId_bookId_key" ON "BookFollow"("userId", "bookId");

-- AddForeignKey
ALTER TABLE "BookFollow" ADD CONSTRAINT "BookFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookFollow" ADD CONSTRAINT "BookFollow_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
