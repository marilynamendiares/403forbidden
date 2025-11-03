// src/server/follow.ts
import { prisma } from "@/server/db";

export async function getBookBySlug(slug: string) {
  // В твоей схеме slug не уникален (уникален ownerId+slug), поэтому берём первый по slug.
  return prisma.book.findFirst({ where: { slug } });
}

export async function getFollowStatus(userId: string | null, bookId: string) {
  const [count, me] = await Promise.all([
    prisma.bookFollow.count({ where: { bookId } }),
    userId
      ? prisma.bookFollow.findUnique({
          where: { userId_bookId: { userId, bookId } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  return { count, followed: !!me };
}

export async function followBook(userId: string, bookId: string) {
  await prisma.bookFollow.upsert({
    where: { userId_bookId: { userId, bookId } },
    update: {},
    create: { userId, bookId },
  });
  return getFollowStatus(userId, bookId);
}

export async function unfollowBook(userId: string, bookId: string) {
  await prisma.bookFollow
    .delete({ where: { userId_bookId: { userId, bookId } } })
    .catch(() => {});
  return getFollowStatus(userId, bookId);
}

export async function listBookFollowerIds(bookId: string): Promise<string[]> {
  const rows = await prisma.bookFollow.findMany({
    where: { bookId },
    select: { userId: true },
  });
  return rows.map((r: { userId: string }) => r.userId);
}
