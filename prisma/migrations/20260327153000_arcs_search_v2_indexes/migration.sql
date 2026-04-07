CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
BEGIN
  IF to_regclass('"BookSearchDocument"') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "BookSearchDocument_combinedText_trgm_idx"
      ON "BookSearchDocument" USING GIN ("combinedText" gin_trgm_ops)';

    EXECUTE 'CREATE INDEX IF NOT EXISTS "BookSearchDocument_titleText_trgm_idx"
      ON "BookSearchDocument" USING GIN ("titleText" gin_trgm_ops)';

    EXECUTE 'CREATE INDEX IF NOT EXISTS "BookSearchDocument_tagsText_trgm_idx"
      ON "BookSearchDocument" USING GIN ("tagsText" gin_trgm_ops)';

    EXECUTE 'CREATE INDEX IF NOT EXISTS "BookSearchDocument_participantsText_trgm_idx"
      ON "BookSearchDocument" USING GIN ("participantsText" gin_trgm_ops)';

    EXECUTE 'CREATE INDEX IF NOT EXISTS "BookSearchDocument_weighted_fts_idx"
      ON "BookSearchDocument" USING GIN (
        (
          setweight(to_tsvector(''simple'', COALESCE("titleText", '''')), ''A'') ||
          setweight(to_tsvector(''simple'', COALESCE("tagsText", '''')), ''A'') ||
          setweight(to_tsvector(''simple'', COALESCE("participantsText", '''')), ''B'') ||
          setweight(to_tsvector(''simple'', COALESCE("hookText", '''')), ''B'') ||
          setweight(to_tsvector(''simple'', COALESCE("summaryText", '''')), ''C'') ||
          setweight(to_tsvector(''simple'', COALESCE("chapterTitlesText", '''')), ''C'') ||
          setweight(to_tsvector(''simple'', COALESCE("postFragmentsText", '''')), ''D'')
        )
      )';
  ELSIF to_regclass('"ArcSearchDocument"') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "ArcSearchDocument_combinedText_trgm_idx"
      ON "ArcSearchDocument" USING GIN ("combinedText" gin_trgm_ops)';

    EXECUTE 'CREATE INDEX IF NOT EXISTS "ArcSearchDocument_titleText_trgm_idx"
      ON "ArcSearchDocument" USING GIN ("titleText" gin_trgm_ops)';

    EXECUTE 'CREATE INDEX IF NOT EXISTS "ArcSearchDocument_tagsText_trgm_idx"
      ON "ArcSearchDocument" USING GIN ("tagsText" gin_trgm_ops)';

    EXECUTE 'CREATE INDEX IF NOT EXISTS "ArcSearchDocument_participantsText_trgm_idx"
      ON "ArcSearchDocument" USING GIN ("participantsText" gin_trgm_ops)';

    EXECUTE 'CREATE INDEX IF NOT EXISTS "ArcSearchDocument_weighted_fts_idx"
      ON "ArcSearchDocument" USING GIN (
        (
          setweight(to_tsvector(''simple'', COALESCE("titleText", '''')), ''A'') ||
          setweight(to_tsvector(''simple'', COALESCE("tagsText", '''')), ''A'') ||
          setweight(to_tsvector(''simple'', COALESCE("participantsText", '''')), ''B'') ||
          setweight(to_tsvector(''simple'', COALESCE("hookText", '''')), ''B'') ||
          setweight(to_tsvector(''simple'', COALESCE("summaryText", '''')), ''C'') ||
          setweight(to_tsvector(''simple'', COALESCE("chapterTitlesText", '''')), ''C'') ||
          setweight(to_tsvector(''simple'', COALESCE("postFragmentsText", '''')), ''D'')
        )
      )';
  END IF;
END $$;
