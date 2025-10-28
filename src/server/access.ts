import { prisma } from "@/server/db";

export type CollabRole = "OWNER" | "EDITOR" | "VIEWER";

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
  return (collab?.role as CollabRole) ?? null;
}

export function atLeast(role: CollabRole, required: CollabRole) {
  const order: CollabRole[] = ["VIEWER", "EDITOR", "OWNER"];
  return order.indexOf(role) >= order.indexOf(required);
}

export async function requireRole(
  userId: string | undefined,
  bookId: string,
  min: CollabRole
) {
  const role = await getRole(userId, bookId);
  if (!role || !atLeast(role, min)) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  return role;
}
