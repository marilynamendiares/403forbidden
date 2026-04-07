import { prisma } from "@/server/db";
import {
  rebuildArcDiscoveryFoundation,
  rebuildArcMetrics,
  rebuildArcSearchDocument,
} from "@/server/arcs/discoveryFoundation";

export async function refreshDiscoveryForArc(arcId: string) {
  return rebuildArcDiscoveryFoundation(arcId);
}

export async function refreshDiscoveryMetricsForArc(arcId: string) {
  return rebuildArcMetrics(arcId);
}

export async function refreshDiscoverySearchForArc(arcId: string) {
  return rebuildArcSearchDocument(arcId);
}

export async function refreshDiscoveryContentForArc(arcId: string) {
  const [metrics, search] = await Promise.all([
    rebuildArcMetrics(arcId),
    rebuildArcSearchDocument(arcId),
  ]);

  return {
    metrics,
    search,
  };
}

export async function refreshDiscoveryForArcSlug(slug: string) {
  const arc = await prisma.arc.findFirst({
    where: { slug },
    select: { id: true },
  });

  if (!arc) return null;
  return rebuildArcDiscoveryFoundation(arc.id);
}

export async function refreshDiscoveryForChapter(chapterId: string) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { arcId: true },
  });

  if (!chapter) return null;
  return rebuildArcDiscoveryFoundation(chapter.arcId);
}

export async function refreshDiscoveryContentForChapter(chapterId: string) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { arcId: true },
  });

  if (!chapter) return null;
  return refreshDiscoveryContentForArc(chapter.arcId);
}

export async function refreshDiscoveryForPost(postId: string) {
  const post = await prisma.chapterPost.findUnique({
    where: { id: postId },
    select: { chapter: { select: { arcId: true } } },
  });

  if (!post) return null;
  return rebuildArcDiscoveryFoundation(post.chapter.arcId);
}

export async function refreshDiscoveryMetricsForPost(postId: string) {
  const post = await prisma.chapterPost.findUnique({
    where: { id: postId },
    select: { chapter: { select: { arcId: true } } },
  });

  if (!post) return null;
  return rebuildArcMetrics(post.chapter.arcId);
}
