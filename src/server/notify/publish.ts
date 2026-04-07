// src/server/notify/publish.ts
import { recipientsForChapterPublished } from "./recipients";
import { queueEvent } from "@/server/notify/queue";            // <-- ИСПОЛЬЗУЕМ твою очередь
import type { NotificationEvent } from "@/server/notify/types"; // <-- твои типы

type PublishPayload = {
  arcId: string;
  chapterId: string;
  authorId: string;      // кто публикует
  chapterIndex?: number;
  chapterTitle?: string;
  arcSlug?: string;
  arcTitle?: string;
};

export async function onChapterPublished(p: PublishPayload) {
  const recipients = await recipientsForChapterPublished(p.arcId, p.authorId);
  if (recipients.length === 0) return;

  const evt: NotificationEvent = {
    kind: "chapter.published",
    actorId: p.authorId,
    target: { type: "chapter", id: p.chapterId },
    recipients,
    payload: {
      arcId: p.arcId,
      arcSlug: p.arcSlug ?? null,
      arcTitle: p.arcTitle ?? null,
      chapterIndex: p.chapterIndex ?? null,
      chapterTitle: p.chapterTitle ?? null,
    },
  };

  await queueEvent(evt); // <-- твоя очередь принимает один объект-событие
}
