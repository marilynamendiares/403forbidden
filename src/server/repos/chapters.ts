// src/server/repos/chapters.ts
import { prisma } from "@/server/db";
import { emit } from "@/server/events";
import { getRole } from "@/server/access";
import { Prisma } from "@prisma/client";
import { userAuthorSelect } from "@/server/fragments";
import { toAuthorDTO } from "@/server/dto";
import { sanitizeHtml } from "@/server/render/sanitizeHtml";
import { queueEvent } from "@/server/notify/queue";
import { listBookFollowerIds } from "@/server/follow";


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
  book: { id: string; slug: string; title: string; ownerId: string };
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
 * - Черновики/неопубликованные видны только владельцу книги или коллабораторам.
 * - canEdit: владелец книги или автор главы.
 * - canPost: глава OPEN и роль OWNER/EDITOR/AUTHOR по книге.
 */
export async function getChapterBySlugIndex(params: {
  slug: string;
  index: number;
  viewerId?: string | null;
}): Promise<ChapterWithRightsDTO | null> {
  const { slug, index, viewerId } = params;

  const row = await prisma.chapter.findFirst({
    where: { index, book: { slug } },
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
      book: { select: { id: true, slug: true, title: true, ownerId: true } },
    },
  });
  if (!row) return null;

  // доступ к черновику — владелец или коллаборатор книги
  if (row.isDraft || !row.publishedAt) {
    const isOwner = !!viewerId && viewerId === row.book.ownerId;
    const isCollaborator =
      !!viewerId &&
      !!(await prisma.collaborator.findFirst({
        where: { bookId: row.book.id, userId: viewerId, pageId: null },
        select: { id: true },
      }));
    if (!isOwner && !isCollaborator) return null;
  }

  const canEdit = !!viewerId && (viewerId === row.book.ownerId || viewerId === row.authorId);

  let canPost = false;
  if (viewerId) {
    const role = await getRole(viewerId, row.book.id);
    const isOwner = viewerId === row.book.ownerId;
    const isOpen = (row.status ?? "OPEN") === "OPEN";
    canPost = isOpen && (isOwner || role === "EDITOR" || role === "AUTHOR");
  }

  return {
    id: row.id,
    index: row.index,
    title: row.title,
    markdown: row.markdown,
    isDraft: row.isDraft,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
    status: (row.status as "OPEN" | "CLOSED" | null) ?? null,
    book: {
      id: row.book.id,
      slug: row.book.slug,
      title: row.book.title,
      ownerId: row.book.ownerId,
    },
    author: {
      id: row.author?.id ?? null,
      username: (row.author as any)?.username ?? null, // из userAuthorSelect
      displayName: row.author ? (row.author as any).profile?.displayName ?? null : null,
      avatarUrl: row.author ? (row.author as any).profile?.avatarUrl ?? null : null,
      email: (row.author as any)?.email ?? null,
    },
    canEdit,
    canPost,
  };
}

/**
 * Список постов главы с keyset-пагинацией (createdAt,id ASC).
 */
export async function getChapterPosts(params: {
  slug: string;
  index: number;
  limit: number;
  cursor?: string | null;
}): Promise<{ items: ChapterPostDTO[]; nextCursor: string | null }> {
  const { slug, index, limit, cursor } = params;

  const chapter = await prisma.chapter.findFirst({
    where: { index, book: { slug } },
    select: { id: true },
  });
  if (!chapter) return { items: [], nextCursor: null };

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
  const items: ChapterPostDTO[] = slice.map((r) => ({
    id: r.id,
    contentMd: r.contentMd,
    createdAt: r.createdAt.toISOString(),
    editedAt: r.editedAt ? r.editedAt.toISOString() : null,
    author: toAuthorDTO(r.author),
  }));

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

  // Нужны и данные главы, и данные книги (slug/title) для payload уведомления
  const chapter = await prisma.chapter.findFirst({
    where: { index, book: { slug } },
    select: {
      id: true,
      title: true,
      status: true,
      bookId: true,
      book: {
        select: {
          slug: true,
          title: true,
        },
      },
    },
  });

  if (!chapter) throw new Error("Chapter not found");
  if (chapter.status && chapter.status !== "OPEN") throw new Error("Chapter is closed");

  const role = await getRole(userId, chapter.bookId);
  if (!role || !["OWNER", "EDITOR", "AUTHOR"].includes(role)) {
    throw new Error("Forbidden");
  }

  // сырой HTML из редактора
  const rawHtml = contentMd;
  // безопасный HTML для хранения/рендера
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

  // ===== Уведомления (колокольчик) ===========================================
  const followerIds = await listBookFollowerIds(chapter.bookId);

  if (followerIds.length > 0) {
    await queueEvent({
      // ✅ новое валидное значение NotificationType
      kind: "chapter.new_post",
      actorId: userId,
      // ✅ target привязываем к главе, а пост уходим в payload
      target: { type: "chapter", id: chapter.id },
      recipients: followerIds,
      payload: {
        bookId: chapter.bookId,
        bookSlug: chapter.book.slug,
        bookTitle: chapter.book.title,
        chapterId: chapter.id,
        chapterIndex: index,
        chapterTitle: chapter.title,
        postId: created.id,
      },
    });
  }


  // ===== SSE для живого списка постов ========================================
  const safeContent = created.contentHtml ?? created.contentMd;

  await emit("chapter:new_post", {
    slug,
    index,
    chapterId: chapter.id,
    post: {
      id: created.id,
      contentMd: safeContent,
      createdAt: created.createdAt.toISOString(),
      editedAt: created.editedAt ? created.editedAt.toISOString() : null,
      author: toAuthorDTO(created.author),
    },
  });

  const dto: ChapterPostDTO = {
    id: created.id,
    contentMd: safeContent,
    createdAt: created.createdAt.toISOString(),
    editedAt: created.editedAt ? created.editedAt.toISOString() : null,
    author: toAuthorDTO(created.author),
  };

  return dto;
}
