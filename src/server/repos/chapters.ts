// src/server/repos/chapters.ts
import { prisma } from "@/server/db";
import { emit } from "@/server/events";
import { getRole } from "@/server/access";
import { Prisma } from "@prisma/client";
import { userAuthorSelect } from "@/server/fragments";
import { toAuthorDTO } from "@/server/dto";
import { sanitizeHtml } from "@/server/render/sanitizeHtml";
import { getArcViewerAccess } from "@/server/arcs/access";
import {
  getApprovedCharacterIdentitiesForUsers,
  getApprovedCharacterIdentity,
} from "@/server/services/characterIdentity";
import { requirePlayer } from "@/server/player";
import { queueEvent } from "@/server/notify/queue";
import { listArcFollowerIds } from "@/server/follow";
import { refreshDiscoveryContentForArc } from "@/server/arcs/discoveryPipeline";


/* ============================== Types (DTO) ============================== */

export type ChapterDTO = {
  id: string;
  index: number;
  title: string;
  markdown: string | null;
  isDraft: boolean;
  publishedAt: string | null;
  updatedAt: string;
  status: "OPEN" | "CLOSED" | null;
  arc: { id: string; slug: string; title: string; ownerId: string };
  author: {
    id: string | null;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    email: string | null;
  };
};

export type ChapterWithRightsDTO = ChapterDTO & {
  canEdit: boolean;
  canPost: boolean;
};

export type ChapterPageViewDTO = {
  arc: { id: string; slug: string; title: string; ownerId: string };
  chapter: {
    id: string;
    index: number;
    title: string;
    markdown: string | null;
    isDraft: boolean;
    publishedAt: string | null;
    updatedAt: string;
    status?: "OPEN" | "CLOSED";
  };
  author: {
    id: string | null;
    username: string | null;
    displayName: string | null;
    email: string | null;
  };
  canEditIntro: boolean;
  canManageChapter: boolean;
  canDeleteChapter: boolean;
  canPost: boolean;
  canToggle: boolean;
};

export type ChapterPostDTO = {
  id: string;
  contentMd: string;
  createdAt: string;
  editedAt: string | null;
  author: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  character: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
};

export type ChapterPostWithInteractionsDTO = ChapterPostDTO & {
  likesCount: number;
  likedByMe: boolean;
  repCount: number;
  repGivenByMe: boolean;
};

/* ============================ Cursor helpers ============================ */

type Cursor = { createdAt: string; id: string };

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}
export function decodeCursor(token: string | null): Cursor | null {
  if (!token) return null;
  try {
    return JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as Cursor;
  } catch {
    return null;
  }
}

/* ================================ Repos ================================= */

/**
 * Получить главу по slug/index с серверной ACL и флагами прав.
 * - Черновики/неопубликованные видны только владельцу арки или коллабораторам.
 * - canEdit: только автор главы.
 * - canPost: глава OPEN и роль OWNER/EDITOR/AUTHOR по арке.
 */
export async function getChapterBySlugIndex(params: {
  slug: string;
  index: number;
  viewerId?: string | null;
}): Promise<ChapterWithRightsDTO | null> {
  const { slug, index, viewerId } = params;

  const row = await prisma.chapter.findFirst({
    where: { index, arc: { slug } },
    select: {
      id: true,
      index: true,
      title: true,
      markdown: true,
      isDraft: true,
      publishedAt: true,
      updatedAt: true,
      status: true,
      authorId: true,
      author: {
        select: {
          // ВАЖНО: не дублируем id — предполагаем, что userAuthorSelect уже его включает
          // id: true,
          email: true,
          ...userAuthorSelect, // username + profile(displayName, avatarUrl) (+ id)
        },
      },
      arc: {
        select: { id: true, slug: true, title: true, ownerId: true, searchVisibility: true },
      },
    },
  });
  if (!row) return null;

  const access = await getArcViewerAccess({ viewerId, arc: row.arc });
  if (!access.canRead) return null;

  // доступ к черновику — только владелец или приглашённый участник/зритель
  if ((row.isDraft || !row.publishedAt) && !access.canReadDrafts) {
    return null;
  }

  const canEdit = !!viewerId && viewerId === row.authorId;

  let canPost = false;
  if (viewerId) {
    const role = await getRole(viewerId, row.arc.id);
    const isOwner = viewerId === row.arc.ownerId;
    const isOpen = (row.status ?? "OPEN") === "OPEN";
    canPost = isOpen && (isOwner || role === "EDITOR" || role === "AUTHOR");
  }

  const chapterAuthor = row.author as
    | {
        id: string;
        username: string | null;
        email: string | null;
        profile: { displayName: string | null; avatarUrl: string | null } | null;
      }
    | null;

  return {
    id: row.id,
    index: row.index,
    title: row.title,
    markdown: row.markdown,
    isDraft: row.isDraft,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
    status: (row.status as "OPEN" | "CLOSED" | null) ?? null,
    arc: {
      id: row.arc.id,
      slug: row.arc.slug,
      title: row.arc.title,
      ownerId: row.arc.ownerId,
    },
    author: {
      id: chapterAuthor?.id ?? null,
      username: chapterAuthor?.username ?? null,
      displayName: chapterAuthor?.profile?.displayName ?? null,
      avatarUrl: chapterAuthor?.profile?.avatarUrl ?? null,
      email: chapterAuthor?.email ?? null,
    },
    canEdit,
    canPost,
  };
}

export async function getChapterPageView(params: {
  slug: string;
  index: number;
  viewerId?: string | null;
}): Promise<ChapterPageViewDTO | null> {
  const row = await prisma.chapter.findFirst({
    where: { index: params.index, arc: { slug: params.slug } },
    select: {
      id: true,
      index: true,
      title: true,
      markdown: true,
      contentHtml: true,
      isDraft: true,
      publishedAt: true,
      updatedAt: true,
      status: true,
      authorId: true,
      author: {
        select: {
          id: true,
          email: true,
          username: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      },
      arc: {
        select: {
          id: true,
          slug: true,
          title: true,
          ownerId: true,
          searchVisibility: true,
          collaborators: {
            where: {
              userId: params.viewerId ?? "",
              pageId: null,
            },
            select: { role: true },
            take: 1,
          },
        },
      },
    },
  });
  if (!row) return null;

  const access = await getArcViewerAccess({ viewerId: params.viewerId, arc: row.arc });
  if (!access.canRead) return null;
  if ((row.isDraft || !row.publishedAt) && !access.canReadDrafts) return null;

  const viewerRole =
    params.viewerId && params.viewerId === row.arc.ownerId
      ? "OWNER"
      : (row.arc.collaborators[0]?.role ?? null);
  const isAuthor = !!params.viewerId && params.viewerId === row.authorId;
  const canManageChapter = viewerRole === "OWNER" || viewerRole === "EDITOR";
  const isOpen = (row.status ?? "OPEN") === "OPEN";
  const canToggle = canManageChapter;

  return {
    arc: {
      id: row.arc.id,
      slug: row.arc.slug,
      title: row.arc.title,
      ownerId: row.arc.ownerId,
    },
    chapter: {
      id: row.id,
      index: row.index,
      title: row.title,
      markdown: row.contentHtml ?? row.markdown ?? "",
      isDraft: row.isDraft,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      updatedAt: row.updatedAt.toISOString(),
      status: row.status as "OPEN" | "CLOSED" | undefined,
    },
    author: {
      id: row.author?.id ?? null,
      username: row.author?.username ?? null,
      displayName: row.author?.profile?.displayName ?? null,
      email: row.author?.email ?? null,
    },
    canEditIntro: isAuthor,
    canManageChapter,
    canDeleteChapter: viewerRole === "OWNER",
    canPost:
      !!params.viewerId &&
      isOpen &&
      (viewerRole === "OWNER" || viewerRole === "EDITOR" || viewerRole === "AUTHOR"),
    canToggle,
  };
}

export async function getNextPublishedChapterIndex(params: {
  arcId: string;
  currentIndex: number;
}) {
  const chapter = await prisma.chapter.findFirst({
    where: {
      arcId: params.arcId,
      index: { gt: params.currentIndex },
      isDraft: false,
      publishedAt: { not: null },
    },
    orderBy: { index: "asc" },
    select: { index: true },
  });

  return chapter?.index ?? null;
}

/**
 * Список постов главы с keyset-пагинацией (createdAt,id ASC).
 */
export async function getChapterPosts(params: {
  slug: string;
  index: number;
  limit: number;
  cursor?: string | null;
  viewerId?: string | null;
}): Promise<{ items: ChapterPostDTO[]; nextCursor: string | null }> {
  const { slug, index, limit, cursor, viewerId } = params;

  const chapter = await prisma.chapter.findFirst({
    where: { index, arc: { slug } },
    select: {
      id: true,
      isDraft: true,
      publishedAt: true,
      arc: {
        select: {
          id: true,
          ownerId: true,
          searchVisibility: true,
        },
      },
    },
  });
  if (!chapter) return { items: [], nextCursor: null };

  const access = await getArcViewerAccess({ viewerId, arc: chapter.arc });
  if (!access.canRead) return { items: [], nextCursor: null };
  if ((chapter.isDraft || !chapter.publishedAt) && !access.canReadDrafts) {
    return { items: [], nextCursor: null };
  }

  const cur = decodeCursor(cursor ?? null);
  const where: Prisma.ChapterPostWhereInput = cur
    ? {
        chapterId: chapter.id,
        OR: [
          { createdAt: { gt: new Date(cur.createdAt) } },
          { AND: [{ createdAt: { equals: new Date(cur.createdAt) } }, { id: { gt: cur.id } }] },
        ],
      }
    : { chapterId: chapter.id };

  const rows = await prisma.chapterPost.findMany({
    where,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit + 1,
    select: {
      id: true,
      contentMd: true,
      createdAt: true,
      editedAt: true,
      author: { select: userAuthorSelect },
    },
  });

  const slice = rows.slice(0, limit);
  const items = await attachApprovedCharacterIdentities(
    slice.map((r) => ({
      id: r.id,
      contentMd: r.contentMd,
      createdAt: r.createdAt.toISOString(),
      editedAt: r.editedAt ? r.editedAt.toISOString() : null,
      author: toAuthorDTO(r.author),
      character: null,
    }))
  );

  const last = slice.at(-1);
  const nextCursor =
    rows.length > limit && last
      ? encodeCursor({
          createdAt: last.createdAt.toISOString(), // ← фикс: строка, не Date
          id: last.id,
        })
      : null;

  return { items, nextCursor };
}

export async function getChapterPostsByChapterId(params: {
  chapterId: string;
  limit: number;
  cursor?: string | null;
}): Promise<{ items: ChapterPostDTO[]; nextCursor: string | null }> {
  const cur = decodeCursor(params.cursor ?? null);
  const where: Prisma.ChapterPostWhereInput = cur
    ? {
        chapterId: params.chapterId,
        OR: [
          { createdAt: { gt: new Date(cur.createdAt) } },
          { AND: [{ createdAt: { equals: new Date(cur.createdAt) } }, { id: { gt: cur.id } }] },
        ],
      }
    : { chapterId: params.chapterId };

  const rows = await prisma.chapterPost.findMany({
    where,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: params.limit + 1,
    select: {
      id: true,
      contentMd: true,
      createdAt: true,
      editedAt: true,
      author: { select: userAuthorSelect },
    },
  });

  const slice = rows.slice(0, params.limit);
  const items = await attachApprovedCharacterIdentities(
    slice.map((row) => ({
      id: row.id,
      contentMd: row.contentMd,
      createdAt: row.createdAt.toISOString(),
      editedAt: row.editedAt ? row.editedAt.toISOString() : null,
      author: toAuthorDTO(row.author),
      character: null,
    }))
  );

  const last = slice.at(-1);
  const nextCursor =
    rows.length > params.limit && last
      ? encodeCursor({
          createdAt: last.createdAt.toISOString(),
          id: last.id,
        })
      : null;

  return { items, nextCursor };
}

export async function getChapterPostsByArcSlugAndChapterId(params: {
  slug: string;
  chapterId: string;
  limit: number;
  cursor?: string | null;
  viewerId?: string | null;
}): Promise<{ items: ChapterPostDTO[]; nextCursor: string | null } | null> {
  const chapter = await prisma.chapter.findFirst({
    where: { id: params.chapterId, arc: { slug: params.slug } },
    select: {
      id: true,
      isDraft: true,
      publishedAt: true,
      arc: {
        select: {
          id: true,
          ownerId: true,
          searchVisibility: true,
        },
      },
    },
  });
  if (!chapter) return null;

  const access = await getArcViewerAccess({ viewerId: params.viewerId, arc: chapter.arc });
  if (!access.canRead) return { items: [], nextCursor: null };
  if ((chapter.isDraft || !chapter.publishedAt) && !access.canReadDrafts) {
    return { items: [], nextCursor: null };
  }

  return getChapterPostsByChapterId({
    chapterId: chapter.id,
    limit: params.limit,
    cursor: params.cursor,
  });
}

export async function getChapterPostsWithInteractions(params: {
  slug: string;
  index: number;
  limit: number;
  cursor?: string | null;
  viewerId?: string | null;
}): Promise<{
  items: ChapterPostWithInteractionsDTO[];
  nextCursor: string | null;
}> {
  const { items, nextCursor } = await getChapterPosts(params);
  return attachChapterPostInteractions(items, nextCursor, params.viewerId);
}

export async function getChapterPostsWithInteractionsByChapterId(params: {
  chapterId: string;
  limit: number;
  cursor?: string | null;
  viewerId?: string | null;
}): Promise<{
  items: ChapterPostWithInteractionsDTO[];
  nextCursor: string | null;
}> {
  const { items, nextCursor } = await getChapterPostsByChapterId(params);
  return attachChapterPostInteractions(items, nextCursor, params.viewerId);
}

async function attachChapterPostInteractions(
  items: ChapterPostDTO[],
  nextCursor: string | null,
  viewerId?: string | null
): Promise<{
  items: ChapterPostWithInteractionsDTO[];
  nextCursor: string | null;
}> {
  const postIds = items.map((post) => post.id).filter(Boolean);

  if (postIds.length === 0) {
    return {
      items: items.map((item) => ({
        ...item,
        likesCount: 0,
        likedByMe: false,
        repCount: 0,
        repGivenByMe: false,
      })),
      nextCursor,
    };
  }

  const [likesGrouped, repsGrouped, likedRows, repRows] = await Promise.all([
    prisma.chapterPostLike.groupBy({
      by: ["postId"],
      where: { postId: { in: postIds } },
      _count: { _all: true },
    }),
    prisma.chapterPostReputationGrant.groupBy({
      by: ["postId"],
      where: { postId: { in: postIds } },
      _sum: { amount: true },
    }),
    viewerId
      ? prisma.chapterPostLike.findMany({
          where: { userId: viewerId, postId: { in: postIds } },
          select: { postId: true },
        })
      : Promise.resolve([] as { postId: string }[]),
    viewerId
      ? prisma.chapterPostReputationGrant.findMany({
          where: { fromUserId: viewerId, postId: { in: postIds } },
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

  return {
    items: items.map((item) => ({
      ...item,
      likesCount: likesCountMap.get(item.id) ?? 0,
      likedByMe: viewerId ? likedSet.has(item.id) : false,
      repCount: repCountMap.get(item.id) ?? 0,
      repGivenByMe: viewerId ? repGivenSet.has(item.id) : false,
    })),
    nextCursor,
  };
}

async function attachApprovedCharacterIdentities<T extends ChapterPostDTO>(
  items: T[]
): Promise<T[]> {
  const authorIds = [...new Set(items.map((item) => item.author.id).filter(Boolean))];
  if (authorIds.length === 0) return items;

  const byUserId = await getApprovedCharacterIdentitiesForUsers(authorIds);

  return items.map((item) => ({
    ...item,
    character: byUserId.get(item.author.id) ?? null,
  }));
}

type ChapterPostIdentity = {
  id: string;
  index: number;
  title: string;
  status: string | null;
  arcId: string;
  arc: {
    slug: string;
    title: string;
  };
};

async function createChapterPostFromIdentity(input: {
  slug: string;
  chapter: ChapterPostIdentity;
  userId: string;
  contentMd: string;
}) {
  const { slug, chapter, userId, contentMd } = input;

  if (chapter.status && chapter.status !== "OPEN") {
    throw new Error("Chapter is closed");
  }

  await requirePlayer(userId);
  const role = await getRole(userId, chapter.arcId);
  if (!role || !["OWNER", "EDITOR", "AUTHOR"].includes(role)) {
    throw new Error("Forbidden");
  }

  const rawHtml = contentMd;
  const safeHtml = sanitizeHtml(rawHtml);

  const created = await prisma.$transaction(async (tx) => {
    const post = await tx.chapterPost.create({
      data: {
        chapterId: chapter.id,
        authorId: userId,
        contentMd: rawHtml,
        contentHtml: safeHtml,
      },
      select: {
        id: true,
        contentMd: true,
        contentHtml: true,
        createdAt: true,
        editedAt: true,
        author: { select: userAuthorSelect },
      },
    });

    await tx.chapter.update({
      where: { id: chapter.id },
      data: { lastPostAt: post.createdAt },
    });

    return post;
  });

  const followerIds = await listArcFollowerIds(chapter.arcId);

  if (followerIds.length > 0) {
    await queueEvent({
      kind: "chapter.new_post",
      actorId: userId,
      target: { type: "chapter", id: chapter.id },
      recipients: followerIds,
      payload: {
        arcId: chapter.arcId,
        arcSlug: chapter.arc.slug,
        arcTitle: chapter.arc.title,
        chapterId: chapter.id,
        chapterIndex: chapter.index,
        chapterTitle: chapter.title,
        postId: created.id,
      },
    });
  }

  const safeContent = created.contentHtml ?? created.contentMd;
  const character = await getApprovedCharacterIdentity(userId);

  await emit("chapter:new_post", {
    slug,
    index: chapter.index,
    chapterId: chapter.id,
    post: {
      id: created.id,
      contentMd: safeContent,
      createdAt: created.createdAt.toISOString(),
      editedAt: created.editedAt ? created.editedAt.toISOString() : null,
      author: toAuthorDTO(created.author),
      character,
    },
  });

  const dto: ChapterPostDTO = {
    id: created.id,
    contentMd: safeContent,
    createdAt: created.createdAt.toISOString(),
    editedAt: created.editedAt ? created.editedAt.toISOString() : null,
    author: toAuthorDTO(created.author),
    character,
  };

  await refreshDiscoveryContentForArc(chapter.arcId);

  return dto;
}

/**
 * Создать пост в главе (ACL: глава OPEN и роль OWNER/EDITOR/AUTHOR).
 * - Сохраняет сырой HTML и безопасный HTML.
 * - Эмитит SSE "chapter:new_post".
 * - Кладёт событие в очередь уведомлений "chapter.new_post".
 */

export async function createChapterPost(params: {
  slug: string;
  index: number;
  userId: string;
  contentMd: string; // сюда прилетает raw HTML из редактора
}) {
  const { slug, index, userId, contentMd } = params;

  // Нужны и данные главы, и данные арки (slug/title) для payload уведомления
  const chapter = await prisma.chapter.findFirst({
    where: { index, arc: { slug } },
    select: {
      id: true,
      index: true,
      title: true,
      status: true,
      arcId: true,
      arc: {
        select: {
          slug: true,
          title: true,
        },
      },
    },
  });

  if (!chapter) throw new Error("Chapter not found");

  return createChapterPostFromIdentity({
    slug,
    chapter,
    userId,
    contentMd,
  });
}

export async function createChapterPostByArcSlugAndChapterId(params: {
  slug: string;
  chapterId: string;
  userId: string;
  contentMd: string;
}) {
  const chapter = await prisma.chapter.findFirst({
    where: { id: params.chapterId, arc: { slug: params.slug } },
    select: {
      id: true,
      index: true,
      title: true,
      status: true,
      arcId: true,
      arc: {
        select: {
          slug: true,
          title: true,
        },
      },
    },
  });

  if (!chapter) throw new Error("Chapter not found");

  return createChapterPostFromIdentity({
    slug: params.slug,
    chapter,
    userId: params.userId,
    contentMd: params.contentMd,
  });
}
