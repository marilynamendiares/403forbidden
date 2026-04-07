// src/server/repos/forum.ts
import { prisma } from "@/server/db";
import { userAuthorSelect } from "@/server/fragments";
import { toAuthorDTO } from "@/server/dto";
import { randomSlugSuffix } from "@/server/random";
import { isUniqueConstraintError } from "@/server/prismaErrors";

type ThreadCursor = {
  lastActivityAt: string;
  id: string;
};

type PostCursor = {
  createdAt: string;
  id: string;
};

function encodeForumCursor(cursor: ThreadCursor | PostCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeForumCursor<T extends ThreadCursor | PostCursor>(cursor?: string): T | null {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export async function getThreadsByCategory(params: {
  categorySlug: string;
  take: number;
  cursorId?: string;
  includeHidden?: boolean;
}) {
  const cursor = decodeForumCursor<ThreadCursor>(params.cursorId);
  const rows = await prisma.forumThread.findMany({
    where: {
      category: { slug: params.categorySlug },
      deletedAt: null,
      ...(params.includeHidden ? {} : { hiddenAt: null }),
      ...(cursor
        ? {
            OR: [
              { lastActivityAt: { lt: new Date(cursor.lastActivityAt) } },
              {
                AND: [
                  { lastActivityAt: { equals: new Date(cursor.lastActivityAt) } },
                  { id: { gt: cursor.id } },
                ],
              },
            ],
          }
        : {}),
    },
    orderBy: [{ lastActivityAt: "desc" }, { id: "asc" }],
    take: params.take + 1,
    select: {
      id: true,
      slug: true,
      title: true,
      createdAt: true,
      lastActivityAt: true,
      updatedAt: true,
      locked: true,
      hiddenAt: true,
      hiddenById: true,
      author: { select: userAuthorSelect },
      _count: { select: { posts: true } },
    },
  });

  const items = rows.slice(0, params.take).map(r => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    createdAt: r.createdAt,
    lastActivityAt: r.lastActivityAt,
    updatedAt: r.updatedAt,
    locked: r.locked,
    hiddenAt: r.hiddenAt,
    hiddenById: r.hiddenById,
    author: toAuthorDTO(r.author),
    _count: r._count,
  }));

  const nextCursor =
    rows.length > params.take
      ? encodeForumCursor({
          lastActivityAt: rows[params.take - 1]!.lastActivityAt.toISOString(),
          id: rows[params.take - 1]!.id,
        })
      : null;

  return { items, nextCursor };
}

export async function getThreadPostsByCategoryAndSlug(params: {
  categorySlug: string;
  slug: string;
  take: number;
  cursorId?: string;
  includeHidden?: boolean;
  viewerId?: string | null;
}) {
  const cursor = decodeForumCursor<PostCursor>(params.cursorId);
  const thread = await prisma.forumThread.findFirst({
    where: {
      slug: params.slug,
      category: { slug: params.categorySlug },
      deletedAt: null,
      ...(params.includeHidden ? {} : { hiddenAt: null }),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      authorId: true,
      locked: true,
      hiddenAt: true,
      hiddenById: true,
      posts: {
        where: cursor
          ? {
              OR: [
                { createdAt: { gt: new Date(cursor.createdAt) } },
                {
                  AND: [
                    { createdAt: { equals: new Date(cursor.createdAt) } },
                    { id: { gt: cursor.id } },
                  ],
                },
              ],
            }
          : undefined,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: params.take + 1,
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          markdown: true,
          hiddenAt: true,
          hiddenById: true,
          deletedAt: true,
          deletedById: true,
          authorId: true,
          author: { select: userAuthorSelect },
        },
      },
    },
  });
  if (!thread) return null;

  const rows = thread.posts;
  const items = rows.slice(0, params.take).map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    markdown: row.deletedAt || row.hiddenAt ? "" : row.markdown ?? "",
    likesCount: 0,
    likedByMe: false,
    repCount: 0,
    repGivenByMe: false,
    reportedByMe: false,
    hiddenAt: row.hiddenAt?.toISOString() ?? null,
    hiddenById: row.hiddenById ?? null,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    deletedById: row.deletedById ?? null,
    authorId: row.authorId,
    author: row.author,
  }));

  const nextCursor =
    rows.length > params.take
      ? encodeForumCursor({
          createdAt: rows[params.take - 1]!.createdAt.toISOString(),
          id: rows[params.take - 1]!.id,
        })
      : null;

  return {
    thread,
    items: await attachForumPostInteractions(items, params.viewerId),
    nextCursor,
  };
}

export async function getThreadPostsAfterByCategoryAndSlug(params: {
  categorySlug: string;
  slug: string;
  afterCreatedAt: Date;
  afterId?: string | null;
  take: number;
  includeHidden?: boolean;
  viewerId?: string | null;
}) {
  const thread = await prisma.forumThread.findFirst({
    where: {
      slug: params.slug,
      category: { slug: params.categorySlug },
      deletedAt: null,
      ...(params.includeHidden ? {} : { hiddenAt: null }),
    },
    select: {
      id: true,
      authorId: true,
      posts: {
        where: {
          OR: [
            { createdAt: { gt: params.afterCreatedAt } },
            ...(params.afterId
              ? [{ createdAt: { equals: params.afterCreatedAt }, id: { gt: params.afterId } }]
              : []),
          ],
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: params.take,
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          markdown: true,
          hiddenAt: true,
          hiddenById: true,
          deletedAt: true,
          deletedById: true,
          authorId: true,
          author: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!thread) return null;

  const items = thread.posts.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    markdown: row.deletedAt || row.hiddenAt ? "" : row.markdown ?? "",
    likesCount: 0,
    likedByMe: false,
    repCount: 0,
    repGivenByMe: false,
    reportedByMe: false,
    hiddenAt: row.hiddenAt?.toISOString() ?? null,
    hiddenById: row.hiddenById ?? null,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    deletedById: row.deletedById ?? null,
    authorId: row.authorId,
    author: row.author,
  }));

  return {
    thread: {
      id: thread.id,
      authorId: thread.authorId,
    },
    items: await attachForumPostInteractions(items, params.viewerId),
  };
}

type ForumThreadPostDTO = {
  id: string;
  createdAt: string;
  updatedAt: string;
  markdown: string;
  likesCount: number;
  likedByMe: boolean;
  repCount: number;
  repGivenByMe: boolean;
  reportedByMe: boolean;
  hiddenAt?: string | null;
  hiddenById?: string | null;
  deletedAt?: string | null;
  deletedById?: string | null;
  authorId: string;
  author: {
    id: string;
    username: string | null;
    profile: { displayName: string | null; avatarUrl: string | null } | null;
  } | null;
};

async function attachForumPostInteractions(
  items: ForumThreadPostDTO[],
  viewerId?: string | null
): Promise<ForumThreadPostDTO[]> {
  const postIds = items.map((item) => item.id).filter(Boolean);
  if (postIds.length === 0) {
    return items;
  }

  const [likesGrouped, repsGrouped, likedRows, repRows, reportRows] = await Promise.all([
    prisma.forumPostLike.groupBy({
      by: ["postId"],
      where: { postId: { in: postIds } },
      _count: { _all: true },
    }),
    prisma.forumPostReputationGrant.groupBy({
      by: ["postId"],
      where: { postId: { in: postIds } },
      _sum: { amount: true },
    }),
    viewerId
      ? prisma.forumPostLike.findMany({
          where: { userId: viewerId, postId: { in: postIds } },
          select: { postId: true },
        })
      : Promise.resolve([] as { postId: string }[]),
    viewerId
      ? prisma.forumPostReputationGrant.findMany({
          where: { fromUserId: viewerId, postId: { in: postIds } },
          select: { postId: true },
        })
      : Promise.resolve([] as { postId: string }[]),
    viewerId
      ? prisma.forumPostReport.findMany({
          where: { reporterId: viewerId, postId: { in: postIds } },
          select: { postId: true },
        })
      : Promise.resolve([] as { postId: string }[]),
  ]);

  const likesCountMap = new Map<string, number>();
  likesGrouped.forEach((group) => likesCountMap.set(group.postId, group._count._all));

  const repCountMap = new Map<string, number>();
  repsGrouped.forEach((group) => repCountMap.set(group.postId, group._sum.amount ?? 0));

  const likedSet = new Set(likedRows.map((row) => row.postId));
  const repGivenSet = new Set(repRows.map((row) => row.postId));
  const reportedSet = new Set(reportRows.map((row) => row.postId));

  return items.map((item) => ({
    ...item,
    likesCount: likesCountMap.get(item.id) ?? 0,
    likedByMe: viewerId ? likedSet.has(item.id) : false,
    repCount: repCountMap.get(item.id) ?? 0,
    repGivenByMe: viewerId ? repGivenSet.has(item.id) : false,
    reportedByMe: viewerId ? reportedSet.has(item.id) : false,
  }));
}

// + добавить в существующий файл:

export async function getCategories() {
  return prisma.forumCategory.findMany({
    orderBy: { title: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      desc: true,
      readVisibility: true,
      createThreadVisibility: true,
      createPostVisibility: true,
      _count: { select: { threads: true } },
    },
  });
}

export async function getCategoryPolicyBySlug(slug: string) {
  return prisma.forumCategory.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      // these fields exist after migration
      readVisibility: true,
      createThreadVisibility: true,
      createPostVisibility: true,
    },
  });
}

export async function createThread(params: {
  categorySlug?: string;
  categoryId?: string;
  authorId: string;
  title: string;
  content?: string | null;
}) {
  const { authorId, title } = params;
  const content = (params.content ?? "").trim();

  let categoryId = params.categoryId;
  if (!categoryId && params.categorySlug) {
    const cat = await prisma.forumCategory.findUnique({
      where: { slug: params.categorySlug },
      select: { id: true },
    });
    categoryId = cat?.id;
  }
  if (!categoryId) throw new Error("Category not found");

  const base = (title || "thread")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  let slug = base || "thread";

  for (let i = 0; i < 3; i++) {
    try {
      const now = new Date();
      const t = await prisma.forumThread.create({
        data: {
          categoryId,
          authorId,
          title,
          slug,
          lastActivityAt: now,
          ...(content
            ? {
                posts: {
                  create: {
                    authorId,
                    content: { type: "markdown", value: content },
                    markdown: content,
                  },
                },
              }
            : {}),
        },
        select: { id: true, slug: true },
      });
      return t;
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
      slug = `${base}-${randomSlugSuffix(4)}`;
    }
  }
  throw new Error("Cannot create thread");
}

export async function syncForumThreadLastActivity(threadId: string) {
  const [thread, latestPost] = await Promise.all([
    prisma.forumThread.findUnique({
      where: { id: threadId },
      select: { id: true, createdAt: true },
    }),
    prisma.forumPost.findFirst({
      where: { threadId, deletedAt: null, hiddenAt: null },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { createdAt: true },
    }),
  ]);

  if (!thread) return;

  await prisma.forumThread.update({
    where: { id: threadId },
    data: { lastActivityAt: latestPost?.createdAt ?? thread.createdAt },
  });
}
