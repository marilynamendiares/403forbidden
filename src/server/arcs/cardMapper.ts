import { iso } from "@/server/serialize";
import type { ArcCardT } from "@/server/contracts/arcs";
import type { ArcCardRow } from "@/server/arcs/arcSelects";
import type { ArcViewerContext } from "@/server/arcs/viewerContext";
import { inferArcActivityBucket } from "@/server/arcs/ranking";

export function mapArcRowsToCards(
  arcs: ArcCardRow[],
  viewerContext: ArcViewerContext,
  continueUrls?: Map<string, string>
): ArcCardT[] {
  return arcs.map((arc) => {
    const metrics = arc.metrics ?? {
      postsTotal: 0,
      posts7d: 0,
      likes7d: 0,
      rep7d: 0,
      followersCount: 0,
      heatScore: 0,
      lastActivityAt: null,
    };

    return {
      id: arc.id,
      slug: arc.slug,
      publicSlug: arc.publicSlug ?? arc.slug,
      title: arc.title,
      tagline: arc.tagline,
      hook: arc.hook,
      status: arc.status,
      format: arc.format,
      joinPolicy: arc.joinPolicy,
      visibility: arc.visibility,
      allowDiscovery: arc.allowDiscovery,
      activityBucket: inferArcActivityBucket(metrics),
      heatScore: metrics.heatScore,
      followersCount: metrics.followersCount,
      postsTotal: metrics.postsTotal,
      lastActivityAt: iso(metrics.lastActivityAt),
      updatedAt: arc.updatedAt.toISOString(),
      participants: viewerContext.participantsByArcId.get(arc.id) ?? [],
      tags: arc.tags.map((entry) => ({
        name: entry.tag.name,
        slug: entry.tag.slug,
      })),
      continueUrl: continueUrls?.get(arc.id) ?? null,
      isFollowing: viewerContext.viewerId
        ? viewerContext.followingArcIds.has(arc.id)
        : undefined,
      isParticipant: viewerContext.viewerId
        ? viewerContext.participantArcIds.has(arc.id)
        : undefined,
    };
  });
}

export const mapArcBooksToCards = mapArcRowsToCards;
