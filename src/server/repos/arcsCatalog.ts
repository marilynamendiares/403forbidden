import type {
  ArcFormat,
  ArcSearchVisibility,
  ArcStatus,
  ArcVisibility,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { isDiscoverySchemaMissingError } from "@/server/arcs/discoveryCompat";
import { arcCardSelect } from "@/server/arcs/arcSelects";
import {
  DEAD_ACTIVITY_DAYS,
  HOT_ACTIVITY_DAYS,
  HOT_HEAT_SCORE,
  WARM_ACTIVITY_DAYS,
  WARM_HEAT_MIN,
} from "@/server/arcs/ranking";
import { buildArcViewerContext } from "@/server/arcs/viewerContext";
import { mapArcRowsToCards } from "@/server/arcs/cardMapper";
import type { ArcCardT } from "@/server/contracts/arcs";

export type CatalogParams = {
  cursor?: string | null;
  limit?: number;
  q?: string | null;
  status?: ArcStatus | null;
  format?: ArcFormat | null;
  visibility?: ArcVisibility | null;
  activity?: "dead" | "warm" | "hot" | null;
  tag?: string | null;
  includeHidden?: boolean;
  viewerId?: string | null;
  sort?: "recent" | "trending" | "new";
};

type CatalogSortMode = NonNullable<CatalogParams["sort"]>;

type RecentCursor = {
  sort: "recent";
  lastActivityAt: string | null;
  updatedAt: string;
  id: string;
};

type TrendingCursor = {
  sort: "trending";
  heatScore: number;
  updatedAt: string;
  id: string;
};

type NewCursor = {
  sort: "new";
  createdAt: string;
  id: string;
};

type CatalogCursor = RecentCursor | TrendingCursor | NewCursor;

function clampLimit(limit?: number) {
  return Math.min(Math.max(limit ?? 24, 1), 50);
}

function resolveSortMode(sort?: CatalogParams["sort"]): CatalogSortMode {
  return sort ?? "recent";
}

function decodeCursor(cursor: string | null | undefined, sort: CatalogSortMode): CatalogCursor | null {
  if (!cursor) return null;
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as CatalogCursor;
    return decoded.sort === sort ? decoded : null;
  } catch {
    return null;
  }
}

function encodeCursor(input: CatalogCursor) {
  return Buffer.from(JSON.stringify(input)).toString("base64url");
}

function buildOrderBy(sort: CatalogSortMode): Prisma.ArcOrderByWithRelationInput[] {
  if (sort === "trending") {
    return [
      { metrics: { heatScore: "desc" } },
      { updatedAt: "desc" },
      { id: "asc" },
    ];
  }

  if (sort === "new") {
    return [{ createdAt: "desc" }, { id: "asc" }];
  }

  return [
    { metrics: { lastActivityAt: "desc" } },
    { updatedAt: "desc" },
    { id: "asc" },
  ];
}

function buildCursorFilter(sort: CatalogSortMode, cursor: CatalogCursor | null) {
  if (!cursor || cursor.sort !== sort) return {};

  if (sort === "new") {
    const newCursor = cursor as NewCursor;
    return {
      OR: [
        { createdAt: { lt: new Date(newCursor.createdAt) } },
        {
          AND: [
            { createdAt: { equals: new Date(newCursor.createdAt) } },
            { id: { gt: newCursor.id } },
          ],
        },
      ],
    };
  }

  if (sort === "trending") {
    const trendingCursor = cursor as TrendingCursor;
    return {
      OR: [
        { metrics: { heatScore: { lt: trendingCursor.heatScore } } },
        {
          AND: [
            { metrics: { heatScore: trendingCursor.heatScore } },
            { updatedAt: { lt: new Date(trendingCursor.updatedAt) } },
          ],
        },
        {
          AND: [
            { metrics: { heatScore: trendingCursor.heatScore } },
            { updatedAt: { equals: new Date(trendingCursor.updatedAt) } },
            { id: { gt: trendingCursor.id } },
          ],
        },
      ],
    };
  }

  const recentCursor = cursor as RecentCursor;

  if (recentCursor.lastActivityAt === null) {
    return {
      AND: [
        { metrics: { lastActivityAt: null } },
        {
          OR: [
            { updatedAt: { lt: new Date(recentCursor.updatedAt) } },
            {
              AND: [
                { updatedAt: { equals: new Date(recentCursor.updatedAt) } },
                { id: { gt: recentCursor.id } },
              ],
            },
          ],
        },
      ],
    };
  }

  return {
    OR: [
      { metrics: { lastActivityAt: null } },
      { metrics: { lastActivityAt: { lt: new Date(recentCursor.lastActivityAt) } } },
      {
        AND: [
          { metrics: { lastActivityAt: { equals: new Date(recentCursor.lastActivityAt) } } },
          { updatedAt: { lt: new Date(recentCursor.updatedAt) } },
        ],
      },
      {
        AND: [
          { metrics: { lastActivityAt: { equals: new Date(recentCursor.lastActivityAt) } } },
          { updatedAt: { equals: new Date(recentCursor.updatedAt) } },
          { id: { gt: recentCursor.id } },
        ],
      },
    ],
  };
}

function buildNextCursor(
  sort: CatalogSortMode,
  arc: Prisma.ArcGetPayload<{ select: typeof arcCardSelect }>
): CatalogCursor {
  if (sort === "new") {
    return {
      sort,
      createdAt: arc.createdAt.toISOString(),
      id: arc.id,
    };
  }

  if (sort === "trending") {
    return {
      sort,
      heatScore: arc.metrics?.heatScore ?? 0,
      updatedAt: arc.updatedAt.toISOString(),
      id: arc.id,
    };
  }

  return {
    sort,
    lastActivityAt: arc.metrics?.lastActivityAt?.toISOString() ?? null,
    updatedAt: arc.updatedAt.toISOString(),
    id: arc.id,
  };
}

function buildArcWhere(params: CatalogParams) {
  const where: Record<string, unknown> = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.format ? { format: params.format } : {}),
    ...(params.visibility ? { visibility: params.visibility } : {}),
    ...(params.includeHidden
      ? {}
      : {
          allowDiscovery: true,
          searchVisibility: { not: "HIDDEN" satisfies ArcSearchVisibility },
        }),
  };

  if (params.tag) {
    where.tags = {
      some: {
        tag: {
          slug: params.tag,
        },
      },
    };
  }

  if (params.activity) {
    if (params.activity === "dead") {
      where.OR = [
        { metrics: null },
        { metrics: { lastActivityAt: null } },
        {
          metrics: {
            lastActivityAt: { lt: new Date(Date.now() - DEAD_ACTIVITY_DAYS * 24 * 60 * 60 * 1000) },
          },
        },
      ];
    }

    if (params.activity === "warm") {
      where.metrics = {
        lastActivityAt: { gte: new Date(Date.now() - WARM_ACTIVITY_DAYS * 24 * 60 * 60 * 1000) },
        heatScore: { lt: HOT_HEAT_SCORE, gte: WARM_HEAT_MIN },
      };
    }

    if (params.activity === "hot") {
      where.metrics = {
        OR: [
          { heatScore: { gte: HOT_HEAT_SCORE } },
          { lastActivityAt: { gte: new Date(Date.now() - HOT_ACTIVITY_DAYS * 24 * 60 * 60 * 1000) } },
        ],
      };
    }
  }

  if (params.q) {
    where.searchDocument = {
      combinedText: {
        contains: params.q,
        mode: "insensitive",
      },
    };
  }

  return where;
}

export async function getArcsCatalog(params: CatalogParams) {
  try {
    const limit = clampLimit(params.limit);
    const sort = resolveSortMode(params.sort);
    const cursor = decodeCursor(params.cursor, sort);
    const orderBy = buildOrderBy(sort);

    const where = buildArcWhere(params);
    const cursorFilter = buildCursorFilter(sort, cursor);

    const arcs = await prisma.arc.findMany({
      where: {
        ...where,
        ...cursorFilter,
      },
      orderBy,
      take: limit + 1,
      select: arcCardSelect,
    });

    const slice = arcs.slice(0, limit);
    const viewerContext = await buildArcViewerContext({
      viewerId: params.viewerId,
      arcIds: slice.map((arc) => arc.id),
    });
    const items = mapArcRowsToCards(slice, viewerContext);
    const last = slice.at(-1);

    return {
      items,
      nextCursor:
        arcs.length > limit && last
          ? encodeCursor(buildNextCursor(sort, last))
          : null,
    };
  } catch (error) {
    if (!isDiscoverySchemaMissingError(error)) throw error;

    const limit = clampLimit(params.limit);
    const arcs = await prisma.arc.findMany({
      orderBy: params.sort === "new" ? { createdAt: "desc" } : { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        tagline: true,
        status: true,
        type: true,
        updatedAt: true,
        tags: {
          select: {
            tag: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    const filtered = arcs.filter((arc) => {
      if (params.q) {
        const q = params.q.toLowerCase();
        const haystack = [arc.title, arc.tagline ?? "", ...arc.tags.map((entry) => entry.tag.slug)]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (params.status && arc.status !== params.status) return false;
      if (params.format && params.format === "SOLO" && arc.type !== "SOLO") return false;
      if (params.tag && !arc.tags.some((entry) => entry.tag.slug === params.tag)) return false;
      return true;
    });

    const items: ArcCardT[] = filtered.map((arc) => ({
      id: arc.id,
      slug: arc.slug,
      publicSlug: arc.slug,
      title: arc.title,
      tagline: arc.tagline ?? null,
      hook: arc.tagline ?? null,
      status: arc.status,
      format: arc.type === "SOLO" ? "SOLO" : "GROUP",
      joinPolicy: arc.type === "SOLO" ? "PRIVATE" : "CURATED",
      visibility: "STANDARD",
      allowDiscovery: true,
      activityBucket: "warm",
      heatScore: 0,
      followersCount: 0,
      postsTotal: 0,
      lastActivityAt: null,
      updatedAt: arc.updatedAt.toISOString(),
      participants: [],
      tags: arc.tags.map((entry) => ({ name: entry.tag.name, slug: entry.tag.slug })),
      continueUrl: null,
    }));

    return { items, nextCursor: null };
  }
}

export async function searchArcs(params: CatalogParams) {
  return getArcsCatalog({
    ...params,
    sort: params.sort ?? "trending",
  });
}
