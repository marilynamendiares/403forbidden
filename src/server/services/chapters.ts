// src/server/services/chapters.ts
import { prisma } from "@/server/db";
import { emit } from "@/server/events";
import { ChapterStatus } from "@prisma/client";
import { requireRole } from "@/server/access";
import { queueEvent, drainOutbox } from "@/server/notify/queue";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type OpenCloseInput = {
  userId: string;
  bookSlug: string;
  chapterId: string; // это именно ID главы (а не index)
};

export async function openChapter(input: OpenCloseInput) {
  return toggleChapterStatus(input, "OPEN");
}

export async function closeChapter(input: OpenCloseInput) {
  return toggleChapterStatus(input, "CLOSED");
}

async function toggleChapterStatus(
  { userId, bookSlug, chapterId }: OpenCloseInput,
  next: "OPEN" | "CLOSED"
) {
  // 1) Находим книгу по slug (findFirst, т.к. unique у вас другой — ownerId_slug)
  const book = await prisma.book.findFirst({
    where: { slug: bookSlug },
    select: { id: true, ownerId: true, slug: true },
  });
  if (!book) throw new HttpError(404, "Book not found");

  // 2) Находим главу по id в пределах книги
  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, bookId: book.id },
    select: { id: true, status: true },
  });
  if (!chapter) throw new HttpError(404, "Chapter not found");

  // 3) ACL: только OWNER или EDITOR
  const isOwner = userId === book.ownerId;
  let isEditor = false;
  if (!isOwner) {
    const collab = await prisma.collaborator.findFirst({
      where: { bookId: book.id, userId, pageId: null },
      select: { role: true },
    });
    isEditor = collab?.role === "EDITOR" || collab?.role === "OWNER";
  }
  if (!isOwner && !isEditor) {
    throw new HttpError(403, "Forbidden");
  }

  // 4) Нет изменений
  if (chapter.status === next) {
    return { id: chapter.id, status: next };
  }

  // 5) Обновляем статус
  const updated = await prisma.chapter.update({
    where: { id: chapter.id },
    data: { status: next as ChapterStatus },
    select: { id: true, status: true },
  });

  // 6) SSE событие
  const evt = next === "OPEN" ? "chapter:opened" : "chapter:closed";
  emit(evt, {
    bookSlug,
    chapterId: updated.id,
    status: updated.status,
    updatedBy: userId,
  });

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Список глав + создание главы (для /api/books/[slug]/chapters)
// ─────────────────────────────────────────────────────────────────────────────

export async function listChaptersForViewer(input: {
  slug: string;
  viewerId?: string | null;
}) {
  const { slug, viewerId } = input;

  const book = await prisma.book.findFirst({
    where: { slug },
    select: { id: true, title: true, ownerId: true },
  });
  if (!book) return null;

  const canSeeDrafts =
    (!!viewerId && viewerId === book.ownerId) ||
    (!!viewerId &&
      !!(await prisma.collaborator.findFirst({
        where: { bookId: book.id, userId: viewerId, pageId: null },
        select: { id: true },
      })));

  const chapters = await prisma.chapter.findMany({
    where: {
      bookId: book.id,
      ...(canSeeDrafts ? {} : { isDraft: false, publishedAt: { not: null } }),
    },
    orderBy: [{ index: "asc" }],
    select: {
      id: true,
      index: true,
      title: true,
      isDraft: true,
      publishedAt: true,
      createdAt: true,
      _count: {
        select: {
          posts: true, // ✅ Chapter.posts relation
        },
      },
    },
  });

  return {
    book: { id: book.id, title: book.title, ownerId: book.ownerId },
    chapters,
  };
}

type CreateChapterInput = {
  slug: string;
  userId: string;
  title: string;
  content: string;
  publish?: boolean;
};

export async function createChapterForUser(input: CreateChapterInput) {
  const { slug, userId, title, content, publish } = input;

  const book = await prisma.book.findFirst({
    where: { slug },
    select: { id: true, ownerId: true },
  });
  if (!book) {
    throw new HttpError(404, "Book not found");
  }

  await requireRole(userId, book.id, "EDITOR");

  const nextIndex =
    (await prisma.chapter.count({ where: { bookId: book.id } })) + 1;

  const isDraft = !publish;
  const publishRole = userId === book.ownerId ? "OWNER" : "EDITOR";

  const created = await prisma.chapter.create({
    data: {
      bookId: book.id,
      index: nextIndex,
      title,
      content: { type: "markdown", value: content },
      markdown: content,
      isDraft,
      publishedAt: isDraft ? null : new Date(),
      publishRole,
      authorId: userId,
    },
    select: { id: true, index: true, isDraft: true },
  });

  // SSE: обновить список глав
  emit("chapter:created", {
    slug,
    index: created.index,
    chapterId: created.id,
    at: Date.now(),
  });

  // Если глава создана сразу опубликованной — шлём уведомления как в /publish
  if (!created.isDraft) {
    // 1) собрать получателей: владелец, коллабораторы, фолловеры (BookFollow)
    const [collabs, followers, owner] = await Promise.all([
      prisma.collaborator.findMany({
        where: { bookId: book.id },
        select: { userId: true },
      }),
      prisma.bookFollow.findMany({
        where: { bookId: book.id },
        select: { userId: true },
      }),
      prisma.book.findUnique({
        where: { id: book.id },
        select: { ownerId: true },
      }),
    ]);

    const followerIds = new Set<string>(followers.map((f) => f.userId));

    const recipients = new Set<string>();
    if (owner?.ownerId) recipients.add(owner.ownerId);
    collabs.forEach((c) => recipients.add(c.userId));
    followerIds.forEach((id) => recipients.add(id));

    // Автор получает уведомление ТОЛЬКО если сам подписан на книгу
    if (!followerIds.has(userId)) {
      recipients.delete(userId);
    }

    // 2) сложить событие в очередь
    await queueEvent({
      kind: "chapter.published",
      actorId: userId,
      target: { type: "chapter", id: created.id },
      recipients: [...recipients],
      payload: {
        bookId: book.id,
        bookSlug: slug,
        chapterIndex: created.index,
      },
    });

    // 3) SSE: событие публикации для live-списка
    emit("chapter:published", {
      slug,
      index: created.index,
      chapterId: created.id,
      at: Date.now(),
    });

    // 4) На деве — авто-дренаж, чтобы сразу увидеть уведомление
    if (process.env.NODE_ENV !== "production") {
      await drainOutbox({ limit: 100 });
    }
  }

  return created;
}
