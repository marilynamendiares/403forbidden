// src/server/notify/publish.ts
import { recipientsForChapterPublished } from "./recipients";
import { queueEvent } from "@/server/notify/queue";            // <-- ИСПОЛЬЗУЕМ твою очередь
import type { NotificationEvent } from "@/server/notify/types"; // <-- твои типы

type PublishPayload = {
  bookId: string;
  chapterId: string;
  authorId: string;      // кто публикует
  chapterIndex?: number;
  chapterTitle?: string;
};

export async function onChapterPublished(p: PublishPayload) {
  const recipients = await recipientsForChapterPublished(p.bookId, p.authorId);
  if (recipients.length === 0) return;

  const evt: NotificationEvent = {
    kind: "chapter.published",
    actorId: p.authorId,
    target: { type: "chapter", id: p.chapterId },   // TargetType у тебя: "chapter" | "book" | ...
    recipients,
    payload: {
      bookId: p.bookId,
      chapterIndex: p.chapterIndex ?? null,
      chapterTitle: p.chapterTitle ?? null,
    },
  };

  await queueEvent(evt); // <-- твоя очередь принимает один объект-событие
}
