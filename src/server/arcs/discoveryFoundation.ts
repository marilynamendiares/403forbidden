import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db";
import { slugify } from "@/lib/slug";
import { isDiscoverySchemaMissingError } from "@/server/arcs/discoveryCompat";
import { randomSlugSuffix } from "@/server/random";

type DbClient = PrismaClient | Prisma.TransactionClient;

function stripHtmlToText(input: string | null | undefined) {
  return (input ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueText(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => (value ?? "").trim()).filter(Boolean))].join(" ");
}

function computeHeatScore(input: {
  posts7d: number;
  likes7d: number;
  rep7d: number;
  followersCount: number;
  lastActivityAt: Date | null;
}) {
  const freshnessBonus = input.lastActivityAt
    ? Math.max(
        0,
        10 - Math.floor((Date.now() - input.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24))
      )
    : 0;

  return (
    input.posts7d * 5 +
    input.likes7d * 3 +
    input.rep7d * 4 +
    input.followersCount +
    freshnessBonus
  );
}

async function ensureArcPublicSlug(db: DbClient, arcId: string, title: string, publicSlug?: string | null) {
  const nextPublicSlug = publicSlug ?? (await generateUniqueArcPublicSlug(db, title, arcId));

  if (!publicSlug || publicSlug !== nextPublicSlug) {
    await db.arc.update({
      where: { id: arcId },
      data: { publicSlug: nextPublicSlug },
    });
  }

  return nextPublicSlug;
}

export async function generateUniqueArcPublicSlug(
  db: DbClient,
  title: string,
  excludeArcId?: string | null
) {
  const base = slugify(title) || "arc";

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const existing = await db.arc.findFirst({
      where: {
        publicSlug: candidate,
        ...(excludeArcId ? { id: { not: excludeArcId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) return candidate;
  }

  return `${base}-${randomSlugSuffix(6)}`;
}

export async function ensureArcFoundation(db: DbClient, params: { arcId: string; title: string }) {
  try {
    const publicSlug = await generateUniqueArcPublicSlug(db, params.title, params.arcId);

    await db.arc.update({
      where: { id: params.arcId },
      data: {
        publicSlug,
      },
    });

    await db.arcMetrics.upsert({
      where: { arcId: params.arcId },
      update: {},
      create: { arcId: params.arcId },
    });

    await db.arcSearchDocument.upsert({
      where: { arcId: params.arcId },
      update: {},
      create: { arcId: params.arcId },
    });

    return publicSlug;
  } catch (error) {
    if (isDiscoverySchemaMissingError(error)) return null;
    throw error;
  }
}

export async function rebuildArcMetrics(arcId: string, db: DbClient = prisma) {
  try {
    const arc = await db.arc.findUnique({
      where: { id: arcId },
      select: {
        id: true,
        ownerId: true,
        title: true,
        publicSlug: true,
        updatedAt: true,
      },
    });

    if (!arc) return null;

    const publicSlug = await ensureArcPublicSlug(db, arc.id, arc.title, arc.publicSlug);

    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      collaborators,
      chapterAuthorIds,
      postAuthorIds,
      chaptersCount,
      postsTotal,
      posts7d,
      posts30d,
      likes7d,
      likes30d,
      rep7dAgg,
      rep30dAgg,
      followersCount,
      lastChapterPublished,
      lastPost,
    ] = await Promise.all([
      db.collaborator.findMany({
        where: { arcId },
        select: { userId: true },
      }),
      db.chapter.findMany({
        where: { arcId, authorId: { not: null } },
        select: { authorId: true },
        distinct: ["authorId"],
      }),
      db.chapterPost.findMany({
        where: { chapter: { arcId } },
        select: { authorId: true },
        distinct: ["authorId"],
      }),
      db.chapter.count({ where: { arcId } }),
      db.chapterPost.count({ where: { chapter: { arcId } } }),
      db.chapterPost.count({
        where: { chapter: { arcId }, createdAt: { gte: sevenDaysAgo } },
      }),
      db.chapterPost.count({
        where: { chapter: { arcId }, createdAt: { gte: thirtyDaysAgo } },
      }),
      db.chapterPostLike.count({
        where: { post: { chapter: { arcId } }, createdAt: { gte: sevenDaysAgo } },
      }),
      db.chapterPostLike.count({
        where: { post: { chapter: { arcId } }, createdAt: { gte: thirtyDaysAgo } },
      }),
      db.chapterPostReputationGrant.aggregate({
        where: { post: { chapter: { arcId } }, createdAt: { gte: sevenDaysAgo } },
        _sum: { amount: true },
      }),
      db.chapterPostReputationGrant.aggregate({
        where: { post: { chapter: { arcId } }, createdAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
      }),
      db.arcFollow.count({ where: { arcId } }),
      db.chapter.findFirst({
        where: { arcId, publishedAt: { not: null } },
        orderBy: { publishedAt: "desc" },
        select: { publishedAt: true },
      }),
      db.chapterPost.findFirst({
        where: { chapter: { arcId } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { createdAt: true },
      }),
    ]);

    const participantIds = new Set<string>([arc.ownerId]);
    for (const row of collaborators) participantIds.add(row.userId);
    for (const row of chapterAuthorIds) {
      if (row.authorId) participantIds.add(row.authorId);
    }
    for (const row of postAuthorIds) participantIds.add(row.authorId);

    const lastChapterPublishedAt = lastChapterPublished?.publishedAt ?? null;
    const lastPostAt = lastPost?.createdAt ?? null;
    const lastActivityAt = [lastPostAt, lastChapterPublishedAt, arc.updatedAt].reduce<Date | null>(
      (latest, value) => (!value || (latest && value < latest) ? latest : value),
      null
    );

    const rep7d = rep7dAgg._sum.amount ?? 0;
    const rep30d = rep30dAgg._sum.amount ?? 0;
    const heatScore = computeHeatScore({
      posts7d,
      likes7d,
      rep7d,
      followersCount,
      lastActivityAt,
    });

    await db.arcMetrics.upsert({
      where: { arcId },
      update: {
        participantsCount: participantIds.size,
        chaptersCount,
        postsTotal,
        posts7d,
        posts30d,
        likes7d,
        likes30d,
        rep7d,
        rep30d,
        followersCount,
        lastChapterPublishedAt,
        lastPostAt,
        lastActivityAt,
        heatScore,
      },
      create: {
        arcId,
        participantsCount: participantIds.size,
        chaptersCount,
        postsTotal,
        posts7d,
        posts30d,
        likes7d,
        likes30d,
        rep7d,
        rep30d,
        followersCount,
        lastChapterPublishedAt,
        lastPostAt,
        lastActivityAt,
        heatScore,
      },
    });

    return {
      arcId,
      publicSlug,
      heatScore,
      lastActivityAt,
    };
  } catch (error) {
    if (isDiscoverySchemaMissingError(error)) return null;
    throw error;
  }
}

export async function rebuildArcSearchDocument(arcId: string, db: DbClient = prisma) {
  try {
    const arc = await db.arc.findUnique({
      where: { id: arcId },
      select: {
        id: true,
        title: true,
        publicSlug: true,
        owner: {
          select: {
            username: true,
            profile: { select: { displayName: true } },
          },
        },
        tagline: true,
        hook: true,
        summary: true,
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
        collaborators: {
          select: {
            user: {
              select: {
                username: true,
                profile: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
          },
        },
        chapters: {
          select: {
            title: true,
            posts: {
              select: {
                contentMd: true,
                contentHtml: true,
              },
            },
          },
        },
      },
    });

    if (!arc) return null;

    const publicSlug = await ensureArcPublicSlug(db, arc.id, arc.title, arc.publicSlug);

    const participantNames = [
      arc.owner.profile?.displayName ?? arc.owner.username ?? "",
      ...arc.collaborators.map(
        (collaborator) => collaborator.user.profile?.displayName ?? collaborator.user.username ?? ""
      ),
    ].filter(Boolean);

    const chapterTitlesText = uniqueText(arc.chapters.map((chapter) => chapter.title));
    const tagsText = uniqueText(arc.tags.map((entry) => entry.tag.name ?? entry.tag.slug));
    const postFragmentsText = uniqueText(
      arc.chapters
        .flatMap((chapter) => chapter.posts)
        .map((post) => stripHtmlToText(post.contentHtml ?? post.contentMd))
        .filter(Boolean)
    );

    const combinedText = uniqueText([
      arc.title,
      arc.tagline,
      arc.hook,
      arc.summary,
      stripHtmlToText(arc.introHtml),
      tagsText,
      chapterTitlesText,
      postFragmentsText,
      participantNames.join(" "),
    ]);

    await db.arcSearchDocument.upsert({
      where: { arcId: arc.id },
      update: {
        titleText: arc.title,
        taglineText: arc.tagline ?? "",
        hookText: arc.hook ?? "",
        summaryText: uniqueText([arc.summary, stripHtmlToText(arc.introHtml)]),
        participantsText: uniqueText(participantNames),
        tagsText,
        chapterTitlesText,
        postFragmentsText,
        combinedText,
      },
      create: {
        arcId: arc.id,
        titleText: arc.title,
        taglineText: arc.tagline ?? "",
        hookText: arc.hook ?? "",
        summaryText: uniqueText([arc.summary, stripHtmlToText(arc.introHtml)]),
        participantsText: uniqueText(participantNames),
        tagsText,
        chapterTitlesText,
        postFragmentsText,
        combinedText,
      },
    });

    return {
      arcId: arc.id,
      publicSlug,
    };
  } catch (error) {
    if (isDiscoverySchemaMissingError(error)) return null;
    throw error;
  }
}

export async function rebuildArcDiscoveryFoundation(arcId: string, db: DbClient = prisma) {
  try {
    const [metrics, search] = await Promise.all([
      rebuildArcMetrics(arcId, db),
      rebuildArcSearchDocument(arcId, db),
    ]);

    if (!metrics && !search) return null;

    return {
      arcId,
      publicSlug: metrics?.publicSlug ?? search?.publicSlug ?? null,
      heatScore: metrics?.heatScore ?? 0,
      lastActivityAt: metrics?.lastActivityAt ?? null,
    };
  } catch (error) {
    if (isDiscoverySchemaMissingError(error)) return null;
    throw error;
  }
}

export async function rebuildAllArcDiscoveryFoundation(db: DbClient = prisma) {
  const arcs = await db.arc.findMany({
    select: {
      id: true,
    },
    orderBy: { createdAt: "asc" },
  });

  for (const arc of arcs) {
    await rebuildArcDiscoveryFoundation(arc.id, db);
  }

  return { count: arcs.length };
}
