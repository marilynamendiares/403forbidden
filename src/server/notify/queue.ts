// src/server/notify/queue.ts
import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client"; // ← важный импорт для типов JSON
import type { NotificationEvent } from "./types";
import { emitNotifyUser } from "./emit";

/**
 * Поставить событие в outbox.
 */
export async function queueEvent(evt: NotificationEvent) {
  await prisma.outboxEvent.create({
    data: {
      kind: evt.kind,
      entityType: evt.target.type,
      entityId: evt.target.id,
      payload: (evt as unknown) as Prisma.InputJsonValue, // ← строго приводим к JSON-типу Prisma
      status: "pending",
    },
  });
}

/**
 * Дренаж outbox: формирует Notification и пушит через SSE.
 */
export async function drainOutbox(opts: { limit?: number } = {}) {
  const limit = opts.limit ?? 100;

  const items = await prisma.outboxEvent.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let created = 0;
  let errors = 0;

  for (const item of items) {
    try {
      const evt = item.payload as unknown as NotificationEvent;

      // Пустые события пропускаем
      if (!evt || !evt.recipients?.length) {
        await prisma.outboxEvent.update({
          where: { id: item.id },
          data: { status: "done" },
        });
        continue;
      }

      // Создаём уведомления батчом
      const notifs = await prisma.$transaction(
        evt.recipients.map((userId) =>
          prisma.notification.create({
            data: {
              userId,
              type: evt.kind,
              actorId: evt.actorId ?? null,
              targetType: evt.target.type,
              targetId: evt.target.id,
              payload: ((evt.payload ?? {}) as unknown) as Prisma.InputJsonValue, // ← JSON
            },
            // Явно выбираем поля, которые дальше используем
            select: {
              id: true,
              userId: true,
              type: true,
              targetType: true,
              targetId: true,
              isRead: true,
              createdAt: true,
            },
          })
        )
      );

      created += notifs.length;

      // SSE-пуш (лёгкая форма)
      await Promise.all(
        notifs.map((n) =>
          emitNotifyUser(n.userId, {
            id: n.id,
            type: n.type,
            targetType: n.targetType,
            targetId: n.targetId,
            isRead: n.isRead,
            createdAt: n.createdAt.toISOString(),
          })
        )
      );

      await prisma.outboxEvent.update({
        where: { id: item.id },
        data: { status: "done" },
      });
    } catch (err) {
      errors += 1;
      console.error("[notify] drain error", item.id, err);
      await prisma.outboxEvent.update({
        where: { id: item.id },
        data: { status: "error" },
      });
    }
  }

  return { polled: items.length, created, errors };
}
