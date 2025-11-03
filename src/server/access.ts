// src/server/access.ts
import { prisma } from "@/server/db";
import type { CollabRole } from "@prisma/client";

/**
 * Иерархия ролей:
 * VIEWER < AUTHOR < EDITOR < OWNER
 */
const ROLE_ORDER: CollabRole[] = ["VIEWER", "AUTHOR", "EDITOR", "OWNER"];

export function atLeast(role: CollabRole, required: CollabRole) {
  return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(required);
}

/**
 * Получить роль пользователя в рамках книги.
 * "VIEWER" | "AUTHOR" | "EDITOR" | "OWNER" | null
 */
export async function getRole(
  userId: string | undefined,
  bookId: string
): Promise<CollabRole | null> {
  if (!userId) return null;

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { ownerId: true },
  });
  if (!book) return null;

  if (book.ownerId === userId) return "OWNER";

  const collab = await prisma.collaborator.findFirst({
    where: { bookId, userId },
    select: { role: true },
  });

  return collab?.role ?? null;
}

/** Вспомогательно: вычислить bookId из chapterId (возвращаем undefined вместо null) */
async function getBookIdByChapterId(
  chapterId: string
): Promise<string | undefined> {
  const row = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { bookId: true },
  });
  return row?.bookId; // ← undefined, если не найдено
}

type RequireRoleObj = {
  userId?: string;
  bookId?: string;
  chapterId?: string;
  /** Минимально допустимая роль */
  min?: CollabRole;
  /** Любая из перечисленных ролей допустима */
  anyOf?: CollabRole[];
};

export async function requireRole(
  userId: string | undefined,
  bookId: string,
  min: CollabRole
): Promise<CollabRole>;
export async function requireRole(args: RequireRoleObj): Promise<CollabRole>;
export async function requireRole(
  a: string | RequireRoleObj | undefined,
  b?: string,
  c?: CollabRole
): Promise<CollabRole> {
  let userId: string | undefined;
  let bookId: string | undefined;
  let chapterId: string | undefined;
  let min: CollabRole | undefined;
  let anyOf: CollabRole[] | undefined;

  if (typeof a === "string" || a === undefined) {
    // старая сигнатура: (userId, bookId, min)
    userId = a as string | undefined;
    bookId = b;
    min = c;
  } else {
    // новая сигнатура: ({ userId, bookId?, chapterId?, min?, anyOf? })
    ({ userId, bookId, chapterId, min, anyOf } = a);
  }

  if (!userId) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  // Если передан chapterId — получаем bookId (с undefined, не null)
  if (!bookId && chapterId) {
    bookId = await getBookIdByChapterId(chapterId);
  }
  if (!bookId) {
    throw Object.assign(new Error("Book not found"), { status: 404 });
  }

  const role = await getRole(userId, bookId);
  if (!role) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }

  if (anyOf && anyOf.length > 0) {
    if (!anyOf.includes(role)) {
      throw Object.assign(new Error("Forbidden"), { status: 403 });
    }
    return role;
  }

  if (min && !atLeast(role, min)) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }

  return role;
}
