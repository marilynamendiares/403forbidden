import { prisma } from "@/server/db";
import { QUICK_FILTERS } from "@/server/arcs/constants";
import { arcCardSelect } from "@/server/arcs/arcSelects";
import { isDiscoverySchemaMissingError } from "@/server/arcs/discoveryCompat";
import {
  computeNewDiscoveryScore,
  computeRecentDiscoveryScore,
  computeTrendingDiscoveryScore,
} from "@/server/arcs/ranking";
import {
  buildArcViewerContext,
  buildArcViewerMembershipContext,
} from "@/server/arcs/viewerContext";
import { mapArcRowsToCards } from "@/server/arcs/cardMapper";
import type { ArcCardT, ArcsDiscoveryResponseT } from "@/server/contracts/arcs";
import { getArcsCatalog } from "@/server/repos/arcsCatalog";

function indexCardsById<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]));
}

function collectPresentCards(source: Array<{ id: string }>, index: Map<string, ArcCardT>) {
  return source
    .map((item) => index.get(item.id) ?? null)
    .filter((item): item is ArcCardT => item !== null);
}

function indexRowsById<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]));
}

function dedupeArcRowsById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }

  return deduped;
}

function rankAndSliceArcs<T extends { id: string; updatedAt: Date }>(
  arcs: T[],
  score: (arc: T) => number,
  limit: number
) {
  return [...arcs]
    .sort((left, right) => {
      const scoreDelta = score(right) - score(left);
      if (scoreDelta !== 0) return scoreDelta;

      const updatedAtDelta = right.updatedAt.getTime() - left.updatedAt.getTime();
      if (updatedAtDelta !== 0) return updatedAtDelta;

      return left.id.localeCompare(right.id);
    })
    .slice(0, limit);
}

export async function getArcsDiscovery(
  viewerId?: string | null
): Promise<ArcsDiscoveryResponseT> {
  try {
    const [topTrending, newJustStarted, recentlyUpdated, underground, continueRows] =
      await Promise.all([
        prisma.arc.findMany({
          where: {
            allowDiscovery: true,
            searchVisibility: { not: "HIDDEN" },
          },
          orderBy: [{ metrics: { heatScore: "desc" } }, { updatedAt: "desc" }],
          take: 16,
          select: arcCardSelect,
        }),
        prisma.arc.findMany({
          where: {
            allowDiscovery: true,
            searchVisibility: { not: "HIDDEN" },
            metrics: {
              postsTotal: { lte: 5 },
            },
          },
          orderBy: [{ createdAt: "desc" }],
          take: 12,
          select: arcCardSelect,
        }),
        prisma.arc.findMany({
          where: {
            allowDiscovery: true,
            searchVisibility: { not: "HIDDEN" },
            metrics: {
              lastActivityAt: { not: null },
            },
          },
          orderBy: [{ metrics: { lastActivityAt: "desc" } }, { updatedAt: "desc" }],
          take: 16,
          select: arcCardSelect,
        }),
        prisma.arc.findMany({
          where: {
            allowDiscovery: true,
            visibility: "UNDERGROUND",
            searchVisibility: { not: "HIDDEN" },
          },
          orderBy: [{ metrics: { lastActivityAt: "desc" } }, { updatedAt: "desc" }],
          take: 6,
          select: arcCardSelect,
        }),
        viewerId
          ? prisma.arcReadState.findMany({
              where: { userId: viewerId },
              orderBy: { lastVisitedAt: "desc" },
              take: 6,
              select: {
                arcId: true,
                lastChapter: {
                  select: {
                    index: true,
                  },
                },
              },
            })
          : Promise.resolve([]),
      ]);

    const rankedTopTrending = rankAndSliceArcs(topTrending, computeTrendingDiscoveryScore, 6);
    const rankedNewJustStarted = rankAndSliceArcs(
      newJustStarted.filter((arc) => (arc.metrics?.postsTotal ?? 0) <= 3),
      computeNewDiscoveryScore,
      6
    );
    const rankedRecentlyUpdated = rankAndSliceArcs(
      recentlyUpdated,
      computeRecentDiscoveryScore,
      8
    );

    const continueIds = continueRows.map((row) => row.arcId);
    const membership = await buildArcViewerMembershipContext(viewerId);
    const participantIds = continueIds.length === 0 ? [...membership.participantArcIds] : [];
    const mergedContinueIds = [...new Set([...continueIds, ...participantIds])].slice(0, 6);

    const alreadyLoadedArcIndex = indexRowsById([
      ...rankedTopTrending,
      ...rankedNewJustStarted,
      ...rankedRecentlyUpdated,
      ...underground,
    ]);
    const missingContinueArcIds = mergedContinueIds.filter((arcId) => !alreadyLoadedArcIndex.has(arcId));
    const fetchedContinueArcs =
      missingContinueArcIds.length > 0
        ? await prisma.arc.findMany({
            where: { id: { in: missingContinueArcIds } },
            select: arcCardSelect,
          })
        : [];
    const fetchedContinueArcIndex = indexRowsById(fetchedContinueArcs);
    const continueArcs = mergedContinueIds
      .map((arcId) => alreadyLoadedArcIndex.get(arcId) ?? fetchedContinueArcIndex.get(arcId) ?? null)
      .filter((arc): arc is NonNullable<typeof arc> => arc !== null);

    const allArcs = [
      ...rankedTopTrending,
      ...rankedNewJustStarted,
      ...rankedRecentlyUpdated,
      ...underground,
      ...continueArcs,
    ];
    const uniqueDisplayedArcs = dedupeArcRowsById(allArcs);

    const viewerContext = await buildArcViewerContext({
      viewerId,
      arcIds: uniqueDisplayedArcs.map((arc) => arc.id),
      membership,
    });

    const continueRowsByArcId = new Map(
      continueRows.map((row) => [row.arcId, row] as const)
    );
    const continueUrlMap = new Map<string, string>();
    for (const arc of continueArcs) {
      const row = continueRowsByArcId.get(arc.id);
      continueUrlMap.set(
        arc.id,
        row?.lastChapter?.index ? `/arcs/${arc.slug}/${row.lastChapter.index}` : `/arcs/${arc.slug}`
      );
    }

    const cardIndex = indexCardsById(
      mapArcRowsToCards(uniqueDisplayedArcs, viewerContext, continueUrlMap)
    );

    return {
      quickFilters: [...QUICK_FILTERS],
      topTrending: collectPresentCards(rankedTopTrending, cardIndex),
      newJustStarted: collectPresentCards(rankedNewJustStarted, cardIndex),
      recentlyUpdated: collectPresentCards(rankedRecentlyUpdated, cardIndex),
      continueReading: collectPresentCards(continueArcs, cardIndex),
      underground: collectPresentCards(underground, cardIndex),
    };
  } catch (error) {
    if (!isDiscoverySchemaMissingError(error)) throw error;

    const fallback = await getArcsCatalog({
      viewerId,
      sort: "recent",
      limit: 12,
      includeHidden: true,
    });

    return {
      quickFilters: [...QUICK_FILTERS],
      topTrending: fallback.items.slice(0, 6),
      newJustStarted: fallback.items.slice(0, 6),
      recentlyUpdated: fallback.items.slice(0, 8),
      continueReading: [],
      underground: [],
    };
  }
}
