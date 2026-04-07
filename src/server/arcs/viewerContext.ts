import { prisma } from "@/server/db";
import type { ArcCardT } from "@/server/contracts/arcs";

export type ArcViewerContext = {
  viewerId: string | null;
  followingArcIds: Set<string>;
  participantArcIds: Set<string>;
  participantsByArcId: Map<string, ArcCardT["participants"]>;
};

function emptyViewerContext(viewerId?: string | null): ArcViewerContext {
  return {
    viewerId: viewerId ?? null,
    followingArcIds: new Set<string>(),
    participantArcIds: new Set<string>(),
    participantsByArcId: new Map<string, ArcCardT["participants"]>(),
  };
}

async function buildParticipantMap(arcIds: string[]) {
  if (arcIds.length === 0) return new Map<string, ArcCardT["participants"]>();

  const arcs = await prisma.arc.findMany({
    where: { id: { in: arcIds } },
    select: {
      id: true,
      owner: {
        select: {
          id: true,
          username: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      },
      collaborators: {
        select: {
          user: {
            select: {
              id: true,
              username: true,
              profile: { select: { displayName: true, avatarUrl: true } },
            },
          },
        },
        take: 5,
      },
    },
  });

  return new Map(
    arcs.map((arc) => {
      const participants = [arc.owner, ...arc.collaborators.map((collaborator) => collaborator.user)]
        .filter(
          (participant, index, array) =>
            array.findIndex((item) => item.id === participant.id) === index
        )
        .slice(0, 5)
        .map((participant) => ({
          id: participant.id,
          username: participant.username ?? null,
          displayName: participant.profile?.displayName ?? null,
          avatarUrl: participant.profile?.avatarUrl ?? null,
        }));

      return [arc.id, participants];
    })
  );
}

async function buildFollowingSet(viewerId: string) {
  const rows = await prisma.arcFollow.findMany({
    where: { userId: viewerId },
    select: { arcId: true },
  });

  return new Set(rows.map((row) => row.arcId));
}

async function buildFollowingSetForArcIds(viewerId: string, arcIds: string[]) {
  if (arcIds.length === 0) return new Set<string>();

  const rows = await prisma.arcFollow.findMany({
    where: {
      userId: viewerId,
      arcId: { in: arcIds },
    },
    select: { arcId: true },
  });

  return new Set(rows.map((row) => row.arcId));
}

async function buildParticipantSet(viewerId: string) {
  const [owned, collab, authoredChapters, authoredPosts] = await Promise.all([
    prisma.arc.findMany({
      where: { ownerId: viewerId },
      select: { id: true },
    }),
    prisma.collaborator.findMany({
      where: { userId: viewerId, arcId: { not: null } },
      select: { arcId: true },
    }),
    prisma.chapter.findMany({
      where: { authorId: viewerId },
      select: { arcId: true },
    }),
    prisma.chapterPost.findMany({
      where: { authorId: viewerId },
      select: { chapter: { select: { arcId: true } } },
    }),
  ]);

  return new Set<string>([
    ...owned.map((item) => item.id),
    ...collab
      .map((item) => item.arcId)
      .filter((arcId): arcId is string => typeof arcId === "string"),
    ...authoredChapters.map((item) => item.arcId),
    ...authoredPosts.map((item) => item.chapter.arcId),
  ]);
}

async function buildParticipantSetForArcIds(viewerId: string, arcIds: string[]) {
  if (arcIds.length === 0) return new Set<string>();

  const [owned, collab, authoredChapters, authoredPosts] = await Promise.all([
    prisma.arc.findMany({
      where: {
        ownerId: viewerId,
        id: { in: arcIds },
      },
      select: { id: true },
    }),
    prisma.collaborator.findMany({
      where: {
        userId: viewerId,
        arcId: { in: arcIds },
      },
      select: { arcId: true },
    }),
    prisma.chapter.findMany({
      where: {
        authorId: viewerId,
        arcId: { in: arcIds },
      },
      select: { arcId: true },
    }),
    prisma.chapterPost.findMany({
      where: {
        authorId: viewerId,
        chapter: {
          arcId: { in: arcIds },
        },
      },
      select: { chapter: { select: { arcId: true } } },
    }),
  ]);

  return new Set<string>([
    ...owned.map((item) => item.id),
    ...collab
      .map((item) => item.arcId)
      .filter((arcId): arcId is string => typeof arcId === "string"),
    ...authoredChapters.map((item) => item.arcId),
    ...authoredPosts.map((item) => item.chapter.arcId),
  ]);
}

function filterMembershipToArcIds(
  membership: {
    viewerId: string | null;
    followingArcIds: Set<string>;
    participantArcIds: Set<string>;
  },
  arcIds: string[]
) {
  const allowedArcIds = new Set(arcIds);

  return {
    viewerId: membership.viewerId,
    followingArcIds: new Set(
      [...membership.followingArcIds].filter((arcId) => allowedArcIds.has(arcId))
    ),
    participantArcIds: new Set(
      [...membership.participantArcIds].filter((arcId) => allowedArcIds.has(arcId))
    ),
  };
}

export async function buildArcViewerMembershipContext(viewerId?: string | null) {
  if (!viewerId) {
    return {
      viewerId: null,
      followingArcIds: new Set<string>(),
      participantArcIds: new Set<string>(),
    };
  }

  const [followingArcIds, participantArcIds] = await Promise.all([
    buildFollowingSet(viewerId),
    buildParticipantSet(viewerId),
  ]);

  return {
    viewerId,
    followingArcIds,
    participantArcIds,
  };
}

export async function buildArcViewerContext(params: {
  viewerId?: string | null;
  arcIds?: string[];
  membership?: {
    viewerId: string | null;
    followingArcIds: Set<string>;
    participantArcIds: Set<string>;
  } | null;
}): Promise<ArcViewerContext> {
  const viewerId = params.viewerId ?? null;
  const uniqueArcIds = [...new Set((params.arcIds ?? []).filter(Boolean))];

  if (!viewerId) {
    return {
      ...emptyViewerContext(null),
      participantsByArcId: await buildParticipantMap(uniqueArcIds),
    };
  }

  const participantsByArcIdPromise = buildParticipantMap(uniqueArcIds);
  const membershipPromise = params.membership
    ? Promise.resolve(
        uniqueArcIds.length > 0
          ? filterMembershipToArcIds(params.membership, uniqueArcIds)
          : params.membership
      )
    : uniqueArcIds.length > 0
      ? Promise.all([
          buildFollowingSetForArcIds(viewerId, uniqueArcIds),
          buildParticipantSetForArcIds(viewerId, uniqueArcIds),
        ]).then(([followingArcIds, participantArcIds]) => ({
          viewerId,
          followingArcIds,
          participantArcIds,
        }))
      : buildArcViewerMembershipContext(viewerId);

  const [participantsByArcId, membership] = await Promise.all([
    participantsByArcIdPromise,
    membershipPromise,
  ]);

  return {
    viewerId: membership.viewerId,
    participantsByArcId,
    followingArcIds: membership.followingArcIds,
    participantArcIds: membership.participantArcIds,
  };
}
