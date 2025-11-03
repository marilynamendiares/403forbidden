// src/server/notify/recipients.ts
import { listBookFollowerIds } from "@/server/follow";

export async function recipientsForChapterPublished(
  bookId: string,
  authorId: string
): Promise<string[]> {
  const followerIds = await listBookFollowerIds(bookId);
  // можно сюда добавить ещё участников/коллабораторов, если нужно
  const set = new Set(followerIds);
  set.delete(authorId); // не уведомляем автора о своём же событии
  return [...set];
}
