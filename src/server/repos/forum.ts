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

const FORUM_CATEGORY_ID_CACHE_TTL_MS = 60_000;
const FORUM_THREAD_LOOKUP_CACHE_TTL_MS = 30_000;
const FORUM_CATEGORY_THREADS_FIRST_PAGE_CACHE_TTL_MS = 15_000;
const FORUM_THREAD_FIRST_SLICE_CACHE_TTL_MS = 15_000;
type ForumCategoryIdCacheEntry = { id: string; expiresAt: number };
type ForumThreadLookupCacheEntry = {
  value: {
    id: string;
    slug: string;
    title: string;
    authorId: string;
    locked: boolean;
    deletedAt: Date | null;
    hiddenAt: Date | null;
    hiddenById: string | null;
  } | null;
  expiresAt: number;
};
type ForumThreadFirstSliceCacheEntry = {
  value: {
    thread: {
      id: string;
      slug: string;
      title: string;
      authorId: string;
      locked: boolean;
      hiddenAt: Date | null;
      hiddenById: string | null;
    };
    items: ForumThreadPostDTO[];
    nextCursor: string | null;
  };
  expiresAt: number;
};
type ForumCategoryThreadsFirstPageCacheEntry = {
  value: {
    items: Array<{
      id: string;
      slug: string;
      title: string;
      createdAt: Date;
      lastActivityAt: Date;
      updatedAt: Date;
      locked: boolean;
      hiddenAt: Date | null;
      hiddenById: string | null;
      author: ReturnType<typeof toAuthorDTO>;
      _count: {
        posts: number;
      };
    }>;
    nextCursor: string | null;
  };
  expiresAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __forumCategoryIdCache: Map<string, ForumCategoryIdCacheEntry> | undefined;
  // eslint-disable-next-line no-var
  var __forumThreadLookupCache: Map<string, ForumThreadLookupCacheEntry> | undefined;
  // eslint-disable-next-line no-var
  var __forumThreadFirstSliceCache: Map<string, ForumThreadFirstSliceCacheEntry> | undefined;
  // eslint-disable-next-line no-var
  var __forumCategoryThreadsFirstPageCache:
    | Map<string, ForumCategoryThreadsFirstPageCacheEntry>
    | undefined;
}

const forumCategoryIdCache =
  global.__forumCategoryIdCache ?? new Map<string, ForumCategoryIdCacheEntry>();
const forumThreadLookupCache =
  global.__forumThreadLookupCache ??
  new Map<
  string,
    ForumThreadLookupCacheEntry
  >();
const forumThreadFirstSliceCache =
  global.__forumThreadFirstSliceCache ??
  new Map<string, ForumThreadFirstSliceCacheEntry>();
const forumCategoryThreadsFirstPageCache =
  global.__forumCategoryThreadsFirstPageCache ??
  new Map<string, ForumCategoryThreadsFirstPageCacheEntry>();

if (!global.__forumCategoryIdCache) {
  global.__forumCategoryIdCache = forumCategoryIdCache;
}
if (!global.__forumThreadLookupCache) {
  global.__forumThreadLookupCache = forumThreadLookupCache;
}
if (!global.__forumThreadFirstSliceCache) {
  global.__forumThreadFirstSliceCache = forumThreadFirstSliceCache;
}
if (!global.__forumCategoryThreadsFirstPageCache) {
  global.__forumCategoryThreadsFirstPageCache = forumCategoryThreadsFirstPageCache;
}

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
  const canUseFirstPageCache = !params.cursorId && !params.includeHidden;
  const firstPageCacheKey = canUseFirstPageCache
    ? `${params.categorySlug}::${params.take}`
    : null;
  if (firstPageCacheKey) {
    const cached = forumCategoryThreadsFirstPageCache.get(firstPageCacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
  }

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

  const result = { items, nextCursor };

  if (firstPageCacheKey) {
    forumCategoryThreadsFirstPageCache.set(firstPageCacheKey, {
      value: result,
      expiresAt: Date.now() + FORUM_CATEGORY_THREADS_FIRST_PAGE_CACHE_TTL_MS,
    });
  }

  return result;
}

async function resolveForumCategoryIdBySlug(slug: string) {
  const now = Date.now();
  const cached = forumCategoryIdCache.get(slug);
  if (cached && cached.expiresAt > now) {
    return cached.id;
  }

  const category = await prisma.forumCategory.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!category) {
    forumCategoryIdCache.delete(slug);
    return null;
  }

  forumCategoryIdCache.set(slug, {
    id: category.id,
    expiresAt: now + FORUM_CATEGORY_ID_CACHE_TTL_MS,
  });
  return category.id;
}

function getForumThreadLookupCacheKey(categorySlug: string, slug: string) {
  return `${categorySlug}::${slug}`;
}

export function invalidateForumThreadLookupCache(categorySlug: string, slug: string) {
  forumThreadLookupCache.delete(getForumThreadLookupCacheKey(categorySlug, slug));
}

function getForumThreadFirstSliceCacheKey(categorySlug: string, slug: string, take: number) {
  return `${categorySlug}::${slug}::${take}`;
}

export function invalidateForumThreadFirstSliceCache(categorySlug: string, slug: string) {
  const prefix = `${categorySlug}::${slug}::`;
  for (const key of forumThreadFirstSliceCache.keys()) {
    if (key.startsWith(prefix)) {
      forumThreadFirstSliceCache.delete(key);
    }
  }
}

export function invalidateForumThreadReadCaches(categorySlug: string, slug: string) {
  invalidateForumThreadLookupCache(categorySlug, slug);
  invalidateForumThreadFirstSliceCache(categorySlug, slug);
}

export function invalidateForumCategoryThreadsFirstPageCache(categorySlug: string) {
  const prefix = `${categorySlug}::`;
  for (const key of forumCategoryThreadsFirstPageCache.keys()) {
    if (key.startsWith(prefix)) {
      forumCategoryThreadsFirstPageCache.delete(key);
    }
  }
}

export function invalidateForumCategoryReadCaches(categorySlug: string, slug?: string) {
  invalidateForumCategoryThreadsFirstPageCache(categorySlug);
  if (slug) {
    invalidateForumThreadReadCaches(categorySlug, slug);
  }
}

export async function getThreadPostsByCategoryAndSlug(params: {
  categorySlug: string;
  slug: string;
  take: number;
  cursorId?: string;
  includeHidden?: boolean;
  viewerId?: string | null;
}) {
  const canUseFirstSliceCache =
    !params.cursorId && !params.includeHidden && !params.viewerId;
  const firstSliceCacheKey = canUseFirstSliceCache
    ? getForumThreadFirstSliceCacheKey(params.categorySlug, params.slug, params.take)
    : null;
  if (firstSliceCacheKey) {
    const cached = forumThreadFirstSliceCache.get(firstSliceCacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
  }

  const cursor = decodeForumCursor<PostCursor>(params.cursorId);
  const thread = await findThreadByCategoryAndSlug({
    categorySlug: params.categorySlug,
    slug: params.slug,
    includeHidden: params.includeHidden,
  });
  if (!thread) return null;

  const rows = await prisma.forumPost.findMany({
    where: {
      threadId: thread.id,
      ...(cursor
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
        : {}),
    },
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
      _count: { select: { likes: true } },
    },
  });

  const items = rows.slice(0, params.take).map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    markdown: row.deletedAt || row.hiddenAt ? "" : row.markdown ?? "",
    likesCount: row._count.likes,
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

  const result = {
    thread,
    items: await attachForumPostInteractions(items, params.viewerId),
    nextCursor,
  };

  if (firstSliceCacheKey) {
    forumThreadFirstSliceCache.set(firstSliceCacheKey, {
      value: result,
      expiresAt: Date.now() + FORUM_THREAD_FIRST_SLICE_CACHE_TTL_MS,
    });
  }

  return result;
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
  const thread = await findThreadByCategoryAndSlug({
    categorySlug: params.categorySlug,
    slug: params.slug,
    includeHidden: params.includeHidden,
  });
  if (!thread) return null;

  const rows = await prisma.forumPost.findMany({
    where: {
      threadId: thread.id,
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
      author: { select: userAuthorSelect },
      _count: { select: { likes: true } },
    },
  });

  const items = rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    markdown: row.deletedAt || row.hiddenAt ? "" : row.markdown ?? "",
    likesCount: row._count.likes,
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

async function findThreadByCategoryAndSlug(params: {
  categorySlug: string;
  slug: string;
  includeHidden?: boolean;
}) {
  const cacheKey = getForumThreadLookupCacheKey(params.categorySlug, params.slug);
  const now = Date.now();
  if (!params.includeHidden) {
    const cached = forumThreadLookupCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }
  }

  const categoryId = await resolveForumCategoryIdBySlug(params.categorySlug);
  if (!categoryId) {
    if (!params.includeHidden) {
      forumThreadLookupCache.set(cacheKey, {
        value: null,
        expiresAt: now + FORUM_THREAD_LOOKUP_CACHE_TTL_MS,
      });
    }
    return null;
  }

  const thread = await prisma.forumThread.findUnique({
    where: {
      categoryId_slug: {
        categoryId,
        slug: params.slug,
      },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      authorId: true,
      locked: true,
      deletedAt: true,
      hiddenAt: true,
      hiddenById: true,
    },
  });

  if (!thread || thread.deletedAt) {
    if (!params.includeHidden) {
      forumThreadLookupCache.set(cacheKey, {
        value: null,
        expiresAt: now + FORUM_THREAD_LOOKUP_CACHE_TTL_MS,
      });
    }
    return null;
  }
  if (!params.includeHidden && thread.hiddenAt) {
    forumThreadLookupCache.set(cacheKey, {
      value: null,
      expiresAt: now + FORUM_THREAD_LOOKUP_CACHE_TTL_MS,
    });
    return null;
  }

  if (!params.includeHidden) {
    forumThreadLookupCache.set(cacheKey, {
      value: thread,
      expiresAt: now + FORUM_THREAD_LOOKUP_CACHE_TTL_MS,
    });
  }

  return thread;
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

  const [repsGrouped, likedRows, repRows, reportRows] = await Promise.all([
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

  const repCountMap = new Map<string, number>();
  repsGrouped.forEach((group) => repCountMap.set(group.postId, group._sum.amount ?? 0));

  const likedSet = new Set(likedRows.map((row) => row.postId));
  const repGivenSet = new Set(repRows.map((row) => row.postId));
  const reportedSet = new Set(reportRows.map((row) => row.postId));

  return items.map((item) => ({
    ...item,
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
