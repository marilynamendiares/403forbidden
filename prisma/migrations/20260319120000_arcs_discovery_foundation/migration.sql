ALTER TYPE "BookStatus" ADD VALUE IF NOT EXISTS 'ABANDONED';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BookFormat') THEN
    CREATE TYPE "BookFormat" AS ENUM ('SOLO', 'DUO', 'GROUP');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BookJoinPolicy') THEN
    CREATE TYPE "BookJoinPolicy" AS ENUM ('PRIVATE', 'CURATED', 'OPEN');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BookVisibility') THEN
    CREATE TYPE "BookVisibility" AS ENUM ('STANDARD', 'UNDERGROUND');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BookSearchVisibility') THEN
    CREATE TYPE "BookSearchVisibility" AS ENUM ('PUBLIC', 'LIMITED', 'HIDDEN');
  END IF;
END $$;

ALTER TABLE "Book"
  ADD COLUMN IF NOT EXISTS "publicSlug" TEXT,
  ADD COLUMN IF NOT EXISTS "summary" TEXT,
  ADD COLUMN IF NOT EXISTS "hook" TEXT,
  ADD COLUMN IF NOT EXISTS "format" "BookFormat" NOT NULL DEFAULT 'SOLO',
  ADD COLUMN IF NOT EXISTS "joinPolicy" "BookJoinPolicy" NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN IF NOT EXISTS "visibility" "BookVisibility" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS "searchVisibility" "BookSearchVisibility" NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN IF NOT EXISTS "allowDiscovery" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Book"
SET
  "format" = CASE
    WHEN "type" = 'COOP' THEN 'GROUP'::"BookFormat"
    ELSE 'SOLO'::"BookFormat"
  END,
  "joinPolicy" = CASE
    WHEN "type" = 'COOP' THEN 'CURATED'::"BookJoinPolicy"
    ELSE 'PRIVATE'::"BookJoinPolicy"
  END
WHERE "publicSlug" IS NULL OR "format" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Book_publicSlug_key" ON "Book"("publicSlug");
CREATE INDEX IF NOT EXISTS "Book_publicSlug_idx" ON "Book"("publicSlug");
CREATE INDEX IF NOT EXISTS "Book_allowDiscovery_searchVisibility_visibility_idx"
  ON "Book"("allowDiscovery", "searchVisibility", "visibility");
CREATE INDEX IF NOT EXISTS "Book_status_format_updatedAt_idx"
  ON "Book"("status", "format", "updatedAt" DESC);

CREATE TABLE IF NOT EXISTS "BookMetrics" (
  "bookId" TEXT NOT NULL,
  "participantsCount" INTEGER NOT NULL DEFAULT 0,
  "chaptersCount" INTEGER NOT NULL DEFAULT 0,
  "postsTotal" INTEGER NOT NULL DEFAULT 0,
  "posts7d" INTEGER NOT NULL DEFAULT 0,
  "posts30d" INTEGER NOT NULL DEFAULT 0,
  "likes7d" INTEGER NOT NULL DEFAULT 0,
  "likes30d" INTEGER NOT NULL DEFAULT 0,
  "rep7d" INTEGER NOT NULL DEFAULT 0,
  "rep30d" INTEGER NOT NULL DEFAULT 0,
  "followersCount" INTEGER NOT NULL DEFAULT 0,
  "views7d" INTEGER NOT NULL DEFAULT 0,
  "views30d" INTEGER NOT NULL DEFAULT 0,
  "lastChapterPublishedAt" TIMESTAMP(3),
  "lastPostAt" TIMESTAMP(3),
  "lastActivityAt" TIMESTAMP(3),
  "heatScore" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookMetrics_pkey" PRIMARY KEY ("bookId")
);

CREATE TABLE IF NOT EXISTS "BookSearchDocument" (
  "bookId" TEXT NOT NULL,
  "titleText" TEXT NOT NULL DEFAULT '',
  "taglineText" TEXT NOT NULL DEFAULT '',
  "hookText" TEXT NOT NULL DEFAULT '',
  "summaryText" TEXT NOT NULL DEFAULT '',
  "participantsText" TEXT NOT NULL DEFAULT '',
  "tagsText" TEXT NOT NULL DEFAULT '',
  "chapterTitlesText" TEXT NOT NULL DEFAULT '',
  "postFragmentsText" TEXT NOT NULL DEFAULT '',
  "combinedText" TEXT NOT NULL DEFAULT '',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookSearchDocument_pkey" PRIMARY KEY ("bookId")
);

CREATE TABLE IF NOT EXISTS "BookReadState" (
  "userId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "lastVisitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastChapterId" TEXT,
  "lastPostId" TEXT,
  "lastReadPostCreatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookReadState_pkey" PRIMARY KEY ("userId", "bookId")
);

CREATE INDEX IF NOT EXISTS "BookMetrics_lastActivityAt_idx" ON "BookMetrics"("lastActivityAt" DESC);
CREATE INDEX IF NOT EXISTS "BookMetrics_heatScore_idx" ON "BookMetrics"("heatScore" DESC);
CREATE INDEX IF NOT EXISTS "BookReadState_userId_lastVisitedAt_idx" ON "BookReadState"("userId", "lastVisitedAt" DESC);
CREATE INDEX IF NOT EXISTS "BookReadState_bookId_lastVisitedAt_idx" ON "BookReadState"("bookId", "lastVisitedAt" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BookMetrics_bookId_fkey'
  ) THEN
    ALTER TABLE "BookMetrics"
      ADD CONSTRAINT "BookMetrics_bookId_fkey"
      FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BookSearchDocument_bookId_fkey'
  ) THEN
    ALTER TABLE "BookSearchDocument"
      ADD CONSTRAINT "BookSearchDocument_bookId_fkey"
      FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BookReadState_userId_fkey'
  ) THEN
    ALTER TABLE "BookReadState"
      ADD CONSTRAINT "BookReadState_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BookReadState_bookId_fkey'
  ) THEN
    ALTER TABLE "BookReadState"
      ADD CONSTRAINT "BookReadState_bookId_fkey"
      FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BookReadState_lastChapterId_fkey'
  ) THEN
    ALTER TABLE "BookReadState"
      ADD CONSTRAINT "BookReadState_lastChapterId_fkey"
      FOREIGN KEY ("lastChapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BookReadState_lastPostId_fkey'
  ) THEN
    ALTER TABLE "BookReadState"
      ADD CONSTRAINT "BookReadState_lastPostId_fkey"
      FOREIGN KEY ("lastPostId") REFERENCES "ChapterPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
