// src/app/api/books/[slug]/[index]/publish/route.ts
export const runtime = "nodejs";

import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import type { NextRequest } from "next/server";
import { requireRole } from "@/server/access";
import { queueEvent, drainOutbox } from "@/server/notify/queue";
import { emit } from "@/server/events"; // ← ВАЖНО: публичные SSE-события

type Ctx = { params: Promise<{ slug: string; index: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { slug, index } = await params;

  const session = await getServerSession(authOptions);
  // поддерживаем оба варианта до полной миграции
  const userId = (session?.user?.id ?? (session as any)?.userId) as string | undefined;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 1) {
    return new Response("Bad index", { status: 400 });
  }

  const chapter = await prisma.chapter.findFirst({
    where: { book: { slug }, index: idx },
    select: {
      id: true,
      isDraft: true,
      bookId: true,
      book: { select: { slug: true, ownerId: true } },
    },
  });
  if (!chapter) return new Response("Not found", { status: 404 });

  await requireRole(userId, chapter.bookId, "EDITOR");

  if (!chapter.isDraft) {
    return Response.json({ ok: true, alreadyPublished: true });
  }

  const updated = await prisma.chapter.update({
    where: { id: chapter.id },
    data: { isDraft: false, publishedAt: new Date() },
    select: {
      id: true,
      index: true,
      title: true,
      bookId: true,
      book: { select: { slug: true, ownerId: true, title: true } },
    },
  });

  // ===== Получатели нотификаций (колокольчик) ==================================
  const [collabs, followers] = await Promise.all([
    prisma.collaborator.findMany({
      where: { bookId: updated.bookId },
      select: { userId: true },
    }),
    // ⚠️ используем НОВУЮ таблицу фолловеров книги: BookFollow
    prisma.bookFollow.findMany({
      where: { bookId: updated.bookId },
      select: { userId: true },
    }),
  ]);

  // множество id фолловеров (для проверки: фоловит ли автор)
  const followerIds = new Set<string>(followers.map(f => f.userId));

  const recipients = new Set<string>();

  // владелец книги
  recipients.add(updated.book.ownerId);

  // коллабораторы
  collabs.forEach((c) => recipients.add(c.userId));

  // фолловеры (BookFollow)
  followerIds.forEach((id) => recipients.add(id));

  // ✅ Автор получает уведомление ТОЛЬКО если он фоловит книгу.
  // Если не фоловит — удаляем его из получателей.
  if (!followerIds.has(userId)) {
    recipients.delete(userId);
  }

  await queueEvent({
    kind: "chapter.published",
    actorId: userId,
    target: { type: "chapter", id: updated.id },
    recipients: [...recipients],
    payload: {
      bookId: updated.bookId,
      bookSlug: updated.book.slug,
      bookTitle: updated.book.title,
      chapterIndex: updated.index,
      chapterTitle: updated.title,
    },
  });

  // 🔴 Эмитим событие, которое слушает ChaptersLiveClient
  await emit("chapter:published", {
    slug: updated.book.slug,
    id: updated.id,
  });

  // DEV: авто-дренаж для мгновенной проверки
  let drained: { polled: number; created: number; errors: number } | undefined;
  if (process.env.NODE_ENV !== "production") {
    drained = await drainOutbox({ limit: 100 });
  }

  return Response.json({
    ok: true,
    id: updated.id,
    recipientsCount: recipients.size,
    drained: drained ?? null,
  });
}
