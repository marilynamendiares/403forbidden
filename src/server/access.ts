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
 * Получить роль пользователя в рамках арки.
 * "VIEWER" | "AUTHOR" | "EDITOR" | "OWNER" | null
 */
export async function getRole(
  userId: string | undefined,
  arcId: string
): Promise<CollabRole | null> {
  if (!userId) return null;

  const arc = await prisma.arc.findUnique({
    where: { id: arcId },
    select: {
      ownerId: true,
      collaborators: {
        where: { userId, pageId: null },
        select: { role: true },
        take: 1,
      },
    },
  });
  if (!arc) return null;

  if (arc.ownerId === userId) return "OWNER";

  return arc.collaborators[0]?.role ?? null;
}

/** Вспомогательно: вычислить arcId из chapterId (возвращаем undefined вместо null) */
async function getArcIdByChapterId(
  chapterId: string
): Promise<string | undefined> {
  const row = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { arcId: true },
  });
  return row?.arcId; // ← undefined, если не найдено
}

type RequireRoleObj = {
  userId?: string;
  arcId?: string;
  chapterId?: string;
  /** Минимально допустимая роль */
  min?: CollabRole;
  /** Любая из перечисленных ролей допустима */
  anyOf?: CollabRole[];
};

export async function requireRole(
  userId: string | undefined,
  arcId: string,
  min: CollabRole
): Promise<CollabRole>;
export async function requireRole(args: RequireRoleObj): Promise<CollabRole>;
export async function requireRole(
  a: string | RequireRoleObj | undefined,
  b?: string,
  c?: CollabRole
): Promise<CollabRole> {
  let userId: string | undefined;
  let arcId: string | undefined;
  let chapterId: string | undefined;
  let min: CollabRole | undefined;
  let anyOf: CollabRole[] | undefined;

  if (typeof a === "string" || a === undefined) {
    // старая сигнатура: (userId, arcId, min)
    userId = a as string | undefined;
    arcId = b;
    min = c;
  } else {
    // новая сигнатура: ({ userId, arcId?, chapterId?, min?, anyOf? })
    ({ userId, arcId, chapterId, min, anyOf } = a);
  }

  if (!userId) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  // Если передан chapterId — получаем arcId (с undefined, не null)
  if (!arcId && chapterId) {
    arcId = await getArcIdByChapterId(chapterId);
  }
  if (!arcId) {
    throw Object.assign(new Error("Arc not found"), { status: 404 });
  }

  const role = await getRole(userId, arcId);
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
