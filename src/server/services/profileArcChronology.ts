import { prisma } from "@/server/db";

export type ProfileArcChronologyItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  visibility: string;
  searchVisibility: string;
  role: "creator" | "collaborator" | "participant";
  userPostCount: number;
  lastActivityAt: Date | null;
  updatedAt: Date;
};

export async function getProfileArcChronology(input: {
  userId: string;
  publicOnly: boolean;
  limit?: number;
}): Promise<ProfileArcChronologyItem[]> {
  const rows = await prisma.arc.findMany({
    where: {
      OR: [
        { ownerId: input.userId },
        { collaborators: { some: { userId: input.userId } } },
        { chapters: { some: { authorId: input.userId } } },
        { chapters: { some: { posts: { some: { authorId: input.userId } } } } },
      ],
      ...(input.publicOnly
        ? {
            allowDiscovery: true,
            searchVisibility: { not: "HIDDEN" },
          }
        : {}),
    },
    orderBy: [
      { metrics: { lastActivityAt: "desc" } },
      { updatedAt: "desc" },
      { id: "asc" },
    ],
    take: input.limit ?? 8,
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      visibility: true,
      searchVisibility: true,
      ownerId: true,
      updatedAt: true,
      metrics: { select: { lastActivityAt: true } },
      collaborators: {
        where: { userId: input.userId },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (rows.length === 0) return [];

  const postCounts = await prisma.chapterPost.groupBy({
    by: ["chapterId"],
    where: {
      authorId: input.userId,
      chapter: { arcId: { in: rows.map((row) => row.id) } },
    },
    _count: { _all: true },
  });

  const chapters = await prisma.chapter.findMany({
    where: { id: { in: postCounts.map((row) => row.chapterId) } },
    select: { id: true, arcId: true },
  });
  const chapterArcIndex = new Map(chapters.map((chapter) => [chapter.id, chapter.arcId]));
  const postsByArcId = new Map<string, number>();

  for (const count of postCounts) {
    const arcId = chapterArcIndex.get(count.chapterId);
    if (!arcId) continue;
    postsByArcId.set(arcId, (postsByArcId.get(arcId) ?? 0) + count._count._all);
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    visibility: row.visibility,
    searchVisibility: row.searchVisibility,
    role:
      row.ownerId === input.userId
        ? "creator"
        : row.collaborators.length > 0
          ? "collaborator"
          : "participant",
    userPostCount: postsByArcId.get(row.id) ?? 0,
    lastActivityAt: row.metrics?.lastActivityAt ?? null,
    updatedAt: row.updatedAt,
  }));
}
