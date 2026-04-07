import { prisma } from "@/server/db";

type UpsertArcReadStateInput = {
  userId: string;
  arcId: string;
  lastChapterId?: string | null;
  lastPostId?: string | null;
  lastReadPostCreatedAt?: Date | null;
  lastVisitedAt?: Date;
};

export async function upsertArcReadState(input: UpsertArcReadStateInput) {
  const {
    userId,
    arcId,
    lastChapterId,
    lastPostId,
    lastReadPostCreatedAt,
    lastVisitedAt = new Date(),
  } = input;

  const existing = await prisma.arcReadState.findUnique({
    where: {
      userId_arcId: {
        userId,
        arcId,
      },
    },
    select: {
      userId: true,
      arcId: true,
      lastVisitedAt: true,
      lastChapterId: true,
      lastPostId: true,
      lastReadPostCreatedAt: true,
    },
  });

  const hasNewerReadProgress =
    existing?.lastReadPostCreatedAt &&
    lastReadPostCreatedAt &&
    existing.lastReadPostCreatedAt > lastReadPostCreatedAt;

  const nextLastVisitedAt =
    existing?.lastVisitedAt && existing.lastVisitedAt > lastVisitedAt
      ? existing.lastVisitedAt
      : lastVisitedAt;

  const nextLastChapterId =
    hasNewerReadProgress && existing?.lastChapterId
      ? existing.lastChapterId
      : lastChapterId !== undefined
        ? lastChapterId
        : existing?.lastChapterId ?? null;

  const nextLastPostId =
    hasNewerReadProgress && existing?.lastPostId
      ? existing.lastPostId
      : lastPostId !== undefined
        ? lastPostId
        : existing?.lastPostId ?? null;

  const nextLastReadPostCreatedAt =
    hasNewerReadProgress && existing?.lastReadPostCreatedAt
      ? existing.lastReadPostCreatedAt
      : lastReadPostCreatedAt !== undefined
        ? lastReadPostCreatedAt
        : existing?.lastReadPostCreatedAt ?? null;

  return prisma.arcReadState.upsert({
    where: {
      userId_arcId: {
        userId,
        arcId,
      },
    },
    update: {
      lastVisitedAt: nextLastVisitedAt,
      lastChapterId: nextLastChapterId,
      lastPostId: nextLastPostId,
      lastReadPostCreatedAt: nextLastReadPostCreatedAt,
    },
    create: {
      userId,
      arcId,
      lastVisitedAt: nextLastVisitedAt,
      lastChapterId: nextLastChapterId,
      lastPostId: nextLastPostId,
      lastReadPostCreatedAt: nextLastReadPostCreatedAt,
    },
  });
}

export async function listContinueReading(userId: string, limit = 6) {
  return prisma.arcReadState.findMany({
    where: { userId },
    orderBy: { lastVisitedAt: "desc" },
    take: limit,
    select: {
      lastVisitedAt: true,
      lastChapterId: true,
      lastPostId: true,
      arc: {
        select: {
          id: true,
          title: true,
          slug: true,
          publicSlug: true,
          status: true,
          format: true,
          joinPolicy: true,
          visibility: true,
          hook: true,
          tagline: true,
          metrics: {
            select: {
              heatScore: true,
              lastActivityAt: true,
            },
          },
        },
      },
    },
  });
}
