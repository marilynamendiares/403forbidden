-- Physical SQL rename draft: Book -> Arc
-- Date: 2026-03-31
--
-- IMPORTANT:
-- 1. This is a manual draft, not an applied Prisma migration.
-- 2. Run only after taking a DB backup.
-- 3. After applying, update prisma/schema.prisma to remove obsolete @@map/@map
--    and regenerate Prisma client.

BEGIN;

-- ============================================================================
-- Enum types
-- ============================================================================

ALTER TYPE "BookStatus" RENAME TO "ArcStatus";
ALTER TYPE "BookType" RENAME TO "ArcType";
ALTER TYPE "BookFormat" RENAME TO "ArcFormat";
ALTER TYPE "BookJoinPolicy" RENAME TO "ArcJoinPolicy";
ALTER TYPE "BookVisibility" RENAME TO "ArcVisibility";
ALTER TYPE "BookSearchVisibility" RENAME TO "ArcSearchVisibility";

-- ============================================================================
-- Base arc table
-- ============================================================================

ALTER TABLE "Book" RENAME TO "Arc";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Book_pkey') THEN
    ALTER TABLE "Arc" RENAME CONSTRAINT "Book_pkey" TO "Arc_pkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Book_ownerId_slug_key') THEN
    ALTER TABLE "Arc" RENAME CONSTRAINT "Book_ownerId_slug_key" TO "Arc_ownerId_slug_key";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Book_publicSlug_key') THEN
    ALTER INDEX "Book_publicSlug_key" RENAME TO "Arc_publicSlug_key";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Book_publicSlug_idx') THEN
    ALTER INDEX "Book_publicSlug_idx" RENAME TO "Arc_publicSlug_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Book_allowDiscovery_searchVisibility_visibility_idx') THEN
    ALTER INDEX "Book_allowDiscovery_searchVisibility_visibility_idx"
      RENAME TO "Arc_allowDiscovery_searchVisibility_visibility_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Book_status_format_updatedAt_idx') THEN
    ALTER INDEX "Book_status_format_updatedAt_idx"
      RENAME TO "Arc_status_format_updatedAt_idx";
  END IF;
END $$;

-- ============================================================================
-- Chapter.bookId -> Chapter.arcId
-- ============================================================================

ALTER TABLE "Chapter" RENAME COLUMN "bookId" TO "arcId";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Chapter_bookId_fkey') THEN
    ALTER TABLE "Chapter" RENAME CONSTRAINT "Chapter_bookId_fkey" TO "Chapter_arcId_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Chapter_bookId_index_key') THEN
    ALTER INDEX "Chapter_bookId_index_key" RENAME TO "Chapter_arcId_index_key";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Chapter_bookId_isDraft_publishedAt_idx') THEN
    ALTER INDEX "Chapter_bookId_isDraft_publishedAt_idx"
      RENAME TO "Chapter_arcId_isDraft_publishedAt_idx";
  END IF;
END $$;

-- ============================================================================
-- ArcTag
-- ============================================================================

ALTER TABLE "BookTag" RENAME TO "ArcTag";
ALTER TABLE "ArcTag" RENAME COLUMN "bookId" TO "arcId";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookTag_pkey') THEN
    ALTER TABLE "ArcTag" RENAME CONSTRAINT "BookTag_pkey" TO "ArcTag_pkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookTag_bookId_fkey') THEN
    ALTER TABLE "ArcTag" RENAME CONSTRAINT "BookTag_bookId_fkey" TO "ArcTag_arcId_fkey";
  END IF;
END $$;

-- ============================================================================
-- Follow.bookId -> Follow.arcId
-- ============================================================================

ALTER TABLE "Follow" RENAME COLUMN "bookId" TO "arcId";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Follow_bookId_fkey') THEN
    ALTER TABLE "Follow" RENAME CONSTRAINT "Follow_bookId_fkey" TO "Follow_arcId_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Follow_followerId_userId_bookId_threadId_key') THEN
    ALTER INDEX "Follow_followerId_userId_bookId_threadId_key"
      RENAME TO "Follow_followerId_userId_arcId_threadId_key";
  END IF;
END $$;

-- ============================================================================
-- Collaborator.bookId -> Collaborator.arcId
-- ============================================================================

ALTER TABLE "Collaborator" RENAME COLUMN "bookId" TO "arcId";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Collaborator_bookId_fkey') THEN
    ALTER TABLE "Collaborator" RENAME CONSTRAINT "Collaborator_bookId_fkey" TO "Collaborator_arcId_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Collaborator_userId_bookId_pageId_key') THEN
    ALTER INDEX "Collaborator_userId_bookId_pageId_key"
      RENAME TO "Collaborator_userId_arcId_pageId_key";
  END IF;
END $$;

-- ============================================================================
-- TurnQueue.bookId -> TurnQueue.arcId
-- ============================================================================

ALTER TABLE "TurnQueue" RENAME COLUMN "bookId" TO "arcId";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TurnQueue_bookId_fkey') THEN
    ALTER TABLE "TurnQueue" RENAME CONSTRAINT "TurnQueue_bookId_fkey" TO "TurnQueue_arcId_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'TurnQueue_bookId_userId_key') THEN
    ALTER INDEX "TurnQueue_bookId_userId_key" RENAME TO "TurnQueue_arcId_userId_key";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'TurnQueue_bookId_order_key') THEN
    ALTER INDEX "TurnQueue_bookId_order_key" RENAME TO "TurnQueue_arcId_order_key";
  END IF;
END $$;

-- ============================================================================
-- ArcFollow
-- ============================================================================

ALTER TABLE "BookFollow" RENAME TO "ArcFollow";
ALTER TABLE "ArcFollow" RENAME COLUMN "bookId" TO "arcId";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookFollow_pkey') THEN
    ALTER TABLE "ArcFollow" RENAME CONSTRAINT "BookFollow_pkey" TO "ArcFollow_pkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookFollow_bookId_fkey') THEN
    ALTER TABLE "ArcFollow" RENAME CONSTRAINT "BookFollow_bookId_fkey" TO "ArcFollow_arcId_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookFollow_userId_fkey') THEN
    ALTER TABLE "ArcFollow" RENAME CONSTRAINT "BookFollow_userId_fkey" TO "ArcFollow_userId_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'BookFollow_bookId_createdAt_idx') THEN
    ALTER INDEX "BookFollow_bookId_createdAt_idx" RENAME TO "ArcFollow_arcId_createdAt_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'BookFollow_userId_bookId_key') THEN
    ALTER INDEX "BookFollow_userId_bookId_key" RENAME TO "ArcFollow_userId_arcId_key";
  END IF;
END $$;

-- ============================================================================
-- ArcMetrics
-- ============================================================================

ALTER TABLE "BookMetrics" RENAME TO "ArcMetrics";
ALTER TABLE "ArcMetrics" RENAME COLUMN "bookId" TO "arcId";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookMetrics_pkey') THEN
    ALTER TABLE "ArcMetrics" RENAME CONSTRAINT "BookMetrics_pkey" TO "ArcMetrics_pkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookMetrics_bookId_fkey') THEN
    ALTER TABLE "ArcMetrics" RENAME CONSTRAINT "BookMetrics_bookId_fkey" TO "ArcMetrics_arcId_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'BookMetrics_lastActivityAt_idx') THEN
    ALTER INDEX "BookMetrics_lastActivityAt_idx" RENAME TO "ArcMetrics_lastActivityAt_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'BookMetrics_heatScore_idx') THEN
    ALTER INDEX "BookMetrics_heatScore_idx" RENAME TO "ArcMetrics_heatScore_idx";
  END IF;
END $$;

-- ============================================================================
-- ArcSearchDocument
-- ============================================================================

ALTER TABLE "BookSearchDocument" RENAME TO "ArcSearchDocument";
ALTER TABLE "ArcSearchDocument" RENAME COLUMN "bookId" TO "arcId";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookSearchDocument_pkey') THEN
    ALTER TABLE "ArcSearchDocument" RENAME CONSTRAINT "BookSearchDocument_pkey" TO "ArcSearchDocument_pkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookSearchDocument_bookId_fkey') THEN
    ALTER TABLE "ArcSearchDocument" RENAME CONSTRAINT "BookSearchDocument_bookId_fkey" TO "ArcSearchDocument_arcId_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'BookSearchDocument_combinedText_trgm_idx') THEN
    ALTER INDEX "BookSearchDocument_combinedText_trgm_idx" RENAME TO "ArcSearchDocument_combinedText_trgm_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'BookSearchDocument_titleText_trgm_idx') THEN
    ALTER INDEX "BookSearchDocument_titleText_trgm_idx" RENAME TO "ArcSearchDocument_titleText_trgm_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'BookSearchDocument_tagsText_trgm_idx') THEN
    ALTER INDEX "BookSearchDocument_tagsText_trgm_idx" RENAME TO "ArcSearchDocument_tagsText_trgm_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'BookSearchDocument_participantsText_trgm_idx') THEN
    ALTER INDEX "BookSearchDocument_participantsText_trgm_idx"
      RENAME TO "ArcSearchDocument_participantsText_trgm_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'BookSearchDocument_weighted_fts_idx') THEN
    ALTER INDEX "BookSearchDocument_weighted_fts_idx" RENAME TO "ArcSearchDocument_weighted_fts_idx";
  END IF;
END $$;

-- ============================================================================
-- ArcReadState
-- ============================================================================

ALTER TABLE "BookReadState" RENAME TO "ArcReadState";
ALTER TABLE "ArcReadState" RENAME COLUMN "bookId" TO "arcId";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookReadState_pkey') THEN
    ALTER TABLE "ArcReadState" RENAME CONSTRAINT "BookReadState_pkey" TO "ArcReadState_pkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookReadState_userId_fkey') THEN
    ALTER TABLE "ArcReadState" RENAME CONSTRAINT "BookReadState_userId_fkey" TO "ArcReadState_userId_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookReadState_bookId_fkey') THEN
    ALTER TABLE "ArcReadState" RENAME CONSTRAINT "BookReadState_bookId_fkey" TO "ArcReadState_arcId_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookReadState_lastChapterId_fkey') THEN
    ALTER TABLE "ArcReadState" RENAME CONSTRAINT "BookReadState_lastChapterId_fkey" TO "ArcReadState_lastChapterId_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookReadState_lastPostId_fkey') THEN
    ALTER TABLE "ArcReadState" RENAME CONSTRAINT "BookReadState_lastPostId_fkey" TO "ArcReadState_lastPostId_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'BookReadState_userId_lastVisitedAt_idx') THEN
    ALTER INDEX "BookReadState_userId_lastVisitedAt_idx"
      RENAME TO "ArcReadState_userId_lastVisitedAt_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'BookReadState_bookId_lastVisitedAt_idx') THEN
    ALTER INDEX "BookReadState_bookId_lastVisitedAt_idx"
      RENAME TO "ArcReadState_arcId_lastVisitedAt_idx";
  END IF;
END $$;

COMMIT;
