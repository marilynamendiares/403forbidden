// src/app/api/books/[slug]/[index]/posts/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { z } from "zod";
import { getChapterPosts, createChapterPost } from "@/server/repos/chapters";
import { emit } from "@/server/events"; // 🟢 SSE (лист постов)
import { prisma } from "@/server/db";   // 🔔 для метаданных главы/книги
import { queueEvent, drainOutbox } from "@/server/notify/queue"; // 🔔 notify-очередь
import { listBookFollowerIds } from "@/server/follow";

type Ctx = { params: Promise<{ slug: string; index: string }> };

const PAGE_MAX = 100;

/** Безопасный парсинг индекса главы из сегмента URL */
function toInt(v: string) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/* ============================================================================
   GET /api/books/:slug/:index/posts?cursor=&limit=
   keyset-пагинация по (createdAt,id) ASC
   (Вся логика берётся из repos/chapters.getChapterPosts)
============================================================================ */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { slug, index } = await params;
  const idx = toInt(index);
  if (!idx) return new Response("Bad index", { status: 400 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || "50"), PAGE_MAX);
  const cursor = searchParams.get("cursor") || null;

  const { items, nextCursor } = await getChapterPosts({
    slug,
    index: idx,
    limit,
    cursor,
  });

  // Контракт ответа остаётся прежним
  return Response.json({ items, nextCursor });
}

/* ============================================================================
   POST /api/books/:slug/:index/posts
   body: { contentMd: string }

   1) создаёт пост (через repos/chapters.createChapterPost)
   2) эмитит SSE 'chapter:new_post' для живого списка постов
   3) кладёт событие в notify-очередь → нотификации фолловерам книги
============================================================================ */
const CreatePostSchema = z.object({
  contentMd: z.string().trim().min(1, "Empty content").max(50_000),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const { slug, index } = await params;
  const idx = toInt(index);
  if (!idx) return new Response("Bad index", { status: 400 });

  const session = await getServerSession(authOptions);
  const userId =
    (session?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const parsed = CreatePostSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Bad Request" }, { status: 400 });
  }

  // 1) создаём пост через репозиторий (он уже знает про contentHtml / sanitize и т.п.)
  const dto = await createChapterPost({
    slug,
    index: idx,
    userId,
    contentMd: parsed.data.contentMd,
  });

  // 2) SSE для живого списка постов (как и было)
  emit("chapter:new_post", {
    slug,
    index: idx,
    post: dto,
    at: Date.now(),
  });

  // 3) Нотификации фолловерам книги / коллабам / владельцу
  // ------------------------------------------------------------------
  // Нам нужны метаданные главы и книги
  const chapter = await prisma.chapter.findFirst({
    where: { book: { slug }, index: idx },
    select: {
      id: true,
      index: true,
      bookId: true,
      book: { select: { slug: true, ownerId: true } },
    },
  });

  if (chapter) {
    // получатели: владелец книги, все коллабораторы, все фолловеры
    const [collabs, followerIds] = await Promise.all([
      prisma.collaborator.findMany({
        where: { bookId: chapter.bookId },
        select: { userId: true },
      }),
      listBookFollowerIds(chapter.bookId),
    ]);

    const followerSet = new Set<string>(followerIds);
    const recipients = new Set<string>();

    // владелец
    recipients.add(chapter.book.ownerId);
    // коллабораторы
    collabs.forEach((c) => recipients.add(c.userId));
    // фолловеры
    followerSet.forEach((id) => recipients.add(id));

    // Автор поста получает уведомление ТОЛЬКО если он сам фолловит книгу
    if (!followerSet.has(userId)) {
      recipients.delete(userId);
    }

    if (recipients.size > 0) {
      await queueEvent({
        // NB: используем отдельный kind для нового поста.
        // Если у тебя уже есть ожидаемое имя события — подставь его сюда.
        kind: "chapter.posted" as any,
        actorId: userId,
        target: { type: "chapter", id: chapter.id },
        recipients: [...recipients],
        payload: {
          bookId: chapter.bookId,
          bookSlug: chapter.book.slug,
          chapterIndex: chapter.index,
          postId: dto.id,
        },
      });

      // В dev сразу дреним outbox, чтобы уведомления появлялись мгновенно
      if (process.env.NODE_ENV !== "production") {
        await drainOutbox({ limit: 100 });
      }
    }
  }
  // ------------------------------------------------------------------

  // Совместимый с текущими клиентами формат ответа
  return Response.json({ ok: true, post: dto }, { status: 201 });
}
