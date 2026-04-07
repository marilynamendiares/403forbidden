// src/server/follow.ts
import { prisma } from "@/server/db";
import { refreshDiscoveryMetricsForArc } from "@/server/arcs/discoveryPipeline";

export async function getArcBySlug(slug: string) {
  // В твоей схеме slug не уникален (уникален ownerId+slug), поэтому берём первый по slug.
  return prisma.arc.findFirst({
    where: { slug },
    select: {
      id: true,
      ownerId: true,
      title: true,
      slug: true,
      publicSlug: true,
      tagline: true,
      hook: true,
      summary: true,
      coverUrl: true,
      status: true,
      type: true,
      format: true,
      joinPolicy: true,
      visibility: true,
      searchVisibility: true,
      allowDiscovery: true,
      createdAt: true,
      updatedAt: true,
      introHtml: true,
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
}

export async function getArcFollowStatus(userId: string | null, arcId: string) {
  const [count, me] = await Promise.all([
    prisma.arcFollow.count({ where: { arcId } }),
    userId
      ? prisma.arcFollow.findUnique({
          where: { userId_arcId: { userId, arcId } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  return { count, followed: !!me };
}

export async function followArc(userId: string, arcId: string) {
  await prisma.arcFollow.upsert({
    where: { userId_arcId: { userId, arcId } },
    update: {},
    create: { userId, arcId },
  });
  await refreshDiscoveryMetricsForArc(arcId);
  return getArcFollowStatus(userId, arcId);
}

export async function unfollowArc(userId: string, arcId: string) {
  await prisma.arcFollow
    .delete({ where: { userId_arcId: { userId, arcId } } })
    .catch(() => {});
  await refreshDiscoveryMetricsForArc(arcId);
  return getArcFollowStatus(userId, arcId);
}

export async function listArcFollowerIds(arcId: string): Promise<string[]> {
  const rows = await prisma.arcFollow.findMany({
    where: { arcId },
    select: { userId: true },
  });
  return rows.map((r: { userId: string }) => r.userId);
}
