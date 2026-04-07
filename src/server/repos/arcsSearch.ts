import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { arcCardSelect } from "@/server/arcs/arcSelects";
import { buildArcViewerContext } from "@/server/arcs/viewerContext";
import { mapArcRowsToCards } from "@/server/arcs/cardMapper";
import {
  DEAD_ACTIVITY_DAYS,
  HOT_ACTIVITY_DAYS,
  HOT_HEAT_SCORE,
  WARM_ACTIVITY_DAYS,
  WARM_HEAT_MIN,
} from "@/server/arcs/ranking";
import {
  isDiscoverySchemaMissingError,
  isDiscoverySearchUnavailableError,
} from "@/server/arcs/discoveryCompat";
import { getArcsCatalog, type CatalogParams } from "@/server/repos/arcsCatalog";

type SearchPhysicalNames = {
  arcTable: string;
  searchDocumentTable: string;
  metricsTable: string;
  tagJoinTable: string;
  idColumn: string;
  statusEnum: string;
  formatEnum: string;
  visibilityEnum: string;
  searchVisibilityEnum: string;
};

function sqlIdent(name: string) {
  return Prisma.raw(`"${name}"`);
}

const PHYSICAL_SQL_NAMES: SearchPhysicalNames = {
  arcTable: "Arc",
  searchDocumentTable: "ArcSearchDocument",
  metricsTable: "ArcMetrics",
  tagJoinTable: "ArcTag",
  idColumn: "arcId",
  statusEnum: "ArcStatus",
  formatEnum: "ArcFormat",
  visibilityEnum: "ArcVisibility",
  searchVisibilityEnum: "ArcSearchVisibility",
};

function buildSearchWhereClauses(params: CatalogParams, names: SearchPhysicalNames) {
  const clauses: Prisma.Sql[] = [];

  if (params.status) {
    clauses.push(Prisma.sql`b."status" = ${params.status}::${sqlIdent(names.statusEnum)}`);
  }

  if (params.format) {
    clauses.push(Prisma.sql`b."format" = ${params.format}::${sqlIdent(names.formatEnum)}`);
  }

  if (params.visibility) {
    clauses.push(Prisma.sql`b."visibility" = ${params.visibility}::${sqlIdent(names.visibilityEnum)}`);
  }

  if (!params.includeHidden) {
    clauses.push(Prisma.sql`b."allowDiscovery" = true`);
    clauses.push(
      Prisma.sql`b."searchVisibility" <> 'HIDDEN'::${sqlIdent(names.searchVisibilityEnum)}`
    );
  }

  if (params.tag) {
    clauses.push(
      Prisma.sql`EXISTS (
        SELECT 1
        FROM ${sqlIdent(names.tagJoinTable)} bt
        JOIN "Tag" t ON t.id = bt."tagId"
        WHERE bt.${sqlIdent(names.idColumn)} = b.id
          AND t."slug" = ${params.tag}
      )`
    );
  }

  if (params.activity === "dead") {
    clauses.push(
      Prisma.sql`(
        m.${sqlIdent(names.idColumn)} IS NULL
        OR m."lastActivityAt" IS NULL
        OR m."lastActivityAt" < NOW() - (${DEAD_ACTIVITY_DAYS} * INTERVAL '1 day')
      )`
    );
  }

  if (params.activity === "warm") {
    clauses.push(
      Prisma.sql`(
        m."lastActivityAt" >= NOW() - (${WARM_ACTIVITY_DAYS} * INTERVAL '1 day')
        AND COALESCE(m."heatScore", 0) >= ${WARM_HEAT_MIN}
        AND COALESCE(m."heatScore", 0) < ${HOT_HEAT_SCORE}
      )`
    );
  }

  if (params.activity === "hot") {
    clauses.push(
      Prisma.sql`(
        COALESCE(m."heatScore", 0) >= ${HOT_HEAT_SCORE}
        OR m."lastActivityAt" >= NOW() - (${HOT_ACTIVITY_DAYS} * INTERVAL '1 day')
      )`
    );
  }

  return clauses;
}

function buildSearchOrder(sort: NonNullable<CatalogParams["sort"]>) {
  if (sort === "new") {
    return Prisma.sql`ranked."searchScore" DESC, ranked."createdAt" DESC, ranked."updatedAt" DESC, ranked.id ASC`;
  }

  if (sort === "recent") {
    return Prisma.sql`ranked."searchScore" DESC, ranked."lastActivityAt" DESC NULLS LAST, ranked."updatedAt" DESC, ranked.id ASC`;
  }

  return Prisma.sql`ranked."searchScore" DESC, ranked."heatScore" DESC, ranked."updatedAt" DESC, ranked.id ASC`;
}

async function searchArcsByPhysicalNames(params: CatalogParams, names: SearchPhysicalNames) {
  const q = params.q!.trim();
  const limit = Math.min(Math.max(params.limit ?? 12, 1), 50);
  const sort = params.sort ?? "trending";
  const whereClauses = buildSearchWhereClauses(params, names);
  const likeQuery = `%${q.toLowerCase()}%`;

  const weightedVector = Prisma.sql`
    (
      setweight(to_tsvector('simple', COALESCE(d."titleText", '')), 'A') ||
      setweight(to_tsvector('simple', COALESCE(d."tagsText", '')), 'A') ||
      setweight(to_tsvector('simple', COALESCE(d."participantsText", '')), 'B') ||
      setweight(to_tsvector('simple', COALESCE(d."hookText", '')), 'B') ||
      setweight(to_tsvector('simple', COALESCE(d."summaryText", '')), 'C') ||
      setweight(to_tsvector('simple', COALESCE(d."chapterTitlesText", '')), 'C') ||
      setweight(to_tsvector('simple', COALESCE(d."postFragmentsText", '')), 'D')
    )
  `;

  const searchScore = Prisma.sql`
    (
      CASE WHEN lower(COALESCE(d."titleText", '')) = lower(${q}) THEN 4 ELSE 0 END +
      CASE WHEN lower(COALESCE(d."titleText", '')) LIKE ${likeQuery} THEN 1 ELSE 0 END +
      ts_rank_cd(${weightedVector}, websearch_to_tsquery('simple', ${q})) * 8 +
      GREATEST(
        similarity(COALESCE(d."titleText", ''), ${q}) * 6,
        similarity(COALESCE(d."tagsText", ''), ${q}) * 5,
        similarity(COALESCE(d."participantsText", ''), ${q}) * 4,
        similarity(COALESCE(d."hookText", ''), ${q}) * 2.5,
        similarity(COALESCE(d."summaryText", ''), ${q}) * 2,
        similarity(COALESCE(d."chapterTitlesText", ''), ${q}) * 2,
        similarity(COALESCE(d."postFragmentsText", ''), ${q}) * 1.5,
        similarity(COALESCE(d."combinedText", ''), ${q})
      )
    )
  `;

  const searchPredicate = Prisma.sql`
    (
      ${weightedVector} @@ websearch_to_tsquery('simple', ${q})
      OR similarity(COALESCE(d."titleText", ''), ${q}) > 0.15
      OR similarity(COALESCE(d."tagsText", ''), ${q}) > 0.12
      OR similarity(COALESCE(d."participantsText", ''), ${q}) > 0.12
      OR similarity(COALESCE(d."combinedText", ''), ${q}) > 0.08
      OR COALESCE(d."combinedText", '') ILIKE ${`%${q}%`}
    )
  `;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
    }>
  >(Prisma.sql`
    WITH ranked AS (
      SELECT
        b.id,
        b."createdAt",
        b."updatedAt",
        COALESCE(m."heatScore", 0) AS "heatScore",
        m."lastActivityAt",
        ${searchScore} AS "searchScore"
      FROM ${sqlIdent(names.arcTable)} b
      JOIN ${sqlIdent(names.searchDocumentTable)} d ON d.${sqlIdent(names.idColumn)} = b.id
      LEFT JOIN ${sqlIdent(names.metricsTable)} m ON m.${sqlIdent(names.idColumn)} = b.id
      WHERE ${Prisma.join([Prisma.sql`1 = 1`, ...whereClauses, searchPredicate], " AND ")}
    )
    SELECT ranked.id
    FROM ranked
    ORDER BY ${buildSearchOrder(sort)}
    LIMIT ${limit + 1}
  `);

  const slice = rows.slice(0, limit);
  const orderedIds = slice.map((row) => row.id);

  if (orderedIds.length === 0) {
    return { items: [], nextCursor: null };
  }

  const arcs = await prisma.arc.findMany({
    where: { id: { in: orderedIds } },
    select: arcCardSelect,
  });

  const arcsById = new Map(arcs.map((arc) => [arc.id, arc]));
  const orderedArcs = orderedIds
    .map((id) => arcsById.get(id))
    .filter((arc): arc is NonNullable<typeof arc> => Boolean(arc));

  const viewerContext = await buildArcViewerContext({
    viewerId: params.viewerId,
    arcIds: orderedIds,
  });

  return {
    items: mapArcRowsToCards(orderedArcs, viewerContext),
    nextCursor: null,
  };
}

export async function searchArcs(params: CatalogParams) {
  const q = params.q?.trim();
  if (!q) {
    return getArcsCatalog({
      ...params,
      sort: params.sort ?? "trending",
    });
  }

  const sort = params.sort ?? "trending";
  try {
    return await searchArcsByPhysicalNames(params, PHYSICAL_SQL_NAMES);
  } catch (error) {
    if (!isDiscoverySchemaMissingError(error) && !isDiscoverySearchUnavailableError(error)) {
      throw error;
    }
    return getArcsCatalog({
      ...params,
      sort,
    });
  }
}
