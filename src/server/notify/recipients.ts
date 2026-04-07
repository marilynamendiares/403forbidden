// src/server/notify/recipients.ts
import { listArcFollowerIds } from "@/server/follow";

export async function recipientsForChapterPublished(
  arcId: string,
  authorId: string
): Promise<string[]> {
  const followerIds = await listArcFollowerIds(arcId);
  // можно сюда добавить ещё участников/коллабораторов, если нужно
  const set = new Set(followerIds);
  set.delete(authorId); // не уведомляем автора о своём же событии
  return [...set];
}
