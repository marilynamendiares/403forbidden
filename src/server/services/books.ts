// src/server/services/books.ts
import { prisma } from "@/server/db";
import { slugify } from "@/lib/slug";
import { emit } from "@/server/events";
import { requireRole } from "@/server/access";

export async function listBooks() {
  return prisma.book.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      slug: true,
      title: true,
      createdAt: true,
      status: true,
    },
  });
}

type CreateBookInput = {
  userId: string;
  title: string;
  tagline?: string | null;
};

export async function createBook(input: CreateBookInput) {
  const { userId, title } = input;

  const baseSlug = slugify(title) || "book";
  let slug = baseSlug;

  // Уникальность в пределах ownerId (см. @@unique([ownerId, slug]))
  for (let i = 0; i < 4; i++) {
    try {
      const created = await prisma.book.create({
        data: {
          ownerId: userId,
          title,
          slug,
          tagline: input.tagline ?? null,
        },
        select: { id: true, slug: true, title: true },
      });

      // SSE: уведомим список книг
      emit("book:created", {
        id: created.id,
        slug: created.slug,
        title: created.title,
        at: Date.now(),
      });

      return created;
    } catch {
      // потенциальный конфликт уникальности — меняем slug и ретраим
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }
  }

  throw new Error("Cannot create book");
}

type DeleteBookInput = {
  userId: string;
  slug: string;
};

/**
 * Удаление книги по slug от имени пользователя.
 * Возвращает true, если книга удалена, и false, если не найдена / недоступна пользователю.
 * Бросает ошибку только при реальной технической проблеме.
 */
export async function deleteBookForUser({ userId, slug }: DeleteBookInput): Promise<boolean> {
  // находим книгу, к которой у пользователя есть отношение (владелец/коллаборатор)
  const book = await prisma.book.findFirst({
    where: {
      slug,
      OR: [
        { ownerId: userId },
        { collaborators: { some: { userId, pageId: null } } },
      ],
    },
    select: { id: true, slug: true },
  });

  if (!book) return false;

  // Удалять могут OWNER и EDITOR
  await requireRole(userId, book.id, "EDITOR");

  await prisma.$transaction(async (tx) => {
    await tx.chapter.deleteMany({ where: { bookId: book.id } });
    await tx.collaborator.deleteMany({ where: { bookId: book.id } });
    await tx.book.delete({ where: { id: book.id } });
  });

  // SSE: уведомим список книг
  emit("book:deleted", {
    id: book.id,
    slug: book.slug,
    at: Date.now(),
  });

  return true;
}
