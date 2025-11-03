// src/app/api/books/[slug]/chapters/route.ts
import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { requireRole } from "@/server/access";
import { emit } from "@/server/events"; // 🆕 добавили импорт для SSE
import { queueEvent, drainOutbox } from "@/server/notify/queue"; // 🆕 уведомления

type Ctx = { params: Promise<{ slug: string }> };

// ─────────────────────────────────────────────────────────────────────────────
// GET: список глав книги
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { slug } = await params;

  const session = await getServerSession(authOptions);
  const viewerId = (session as any)?.userId as string | undefined;

  const book = await prisma.book.findFirst({
    where: { slug },
    select: { id: true, title: true, ownerId: true },
  });
  if (!book) return new Response("Not found", { status: 404 });

  const canSeeDrafts =
    (!!viewerId && viewerId === book.ownerId) ||
    (!!viewerId &&
      !!(await prisma.collaborator.findFirst({
        where: { bookId: book.id, userId: viewerId, pageId: null },
        select: { id: true },
      })));

  const chapters = await prisma.chapter.findMany({
    where: {
      bookId: book.id,
      ...(canSeeDrafts ? {} : { isDraft: false, publishedAt: { not: null } }),
    },
    orderBy: [{ index: "asc" }],
    select: {
      id: true,
      index: true,
      title: true,
      isDraft: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  return Response.json({ book: { title: book.title }, chapters });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST: создать главу
// ─────────────────────────────────────────────────────────────────────────────
const CreateSchema = z.object({
  title: z.string().trim().min(2).max(140),
  content: z.string().trim().min(1),
  publish: z.boolean().optional(),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return new Response("Bad Request", { status: 400 });

  const session = await getServerSession(authOptions);
  const userId =
    (session?.user?.id ?? (session as any)?.userId) as string | undefined;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const book = await prisma.book.findFirst({
    where: { slug },
    select: { id: true, ownerId: true },
  });
  if (!book) return new Response("Book not found", { status: 404 });

  await requireRole(userId, book.id, "EDITOR");

  const nextIndex =
    (await prisma.chapter.count({ where: { bookId: book.id } })) + 1;

  const isDraft = !parsed.data.publish;
  const publishRole = userId === book.ownerId ? "OWNER" : "EDITOR";

  const created = await prisma.chapter.create({
    data: {
      bookId: book.id,
      index: nextIndex,
      title: parsed.data.title,
      content: { type: "markdown", value: parsed.data.content },
      markdown: parsed.data.content,
      isDraft,
      publishedAt: isDraft ? null : new Date(),
      publishRole,
      authorId: userId,
    },
    select: { id: true, index: true, isDraft: true }, // достаточно этих полей
  });

  // 🟢 SSE: обновить список глав
  await emit("chapter:created", {
    slug,
    index: created.index,
    chapterId: created.id,
    at: Date.now(),
  });

  // Если глава создана сразу опубликованной — шлём уведомления как в /publish
  if (!created.isDraft) {
    // 1) собрать получателей: владелец, коллабораторы, фолловеры (BookFollow)
    const [collabs, followers, owner] = await Promise.all([
      prisma.collaborator.findMany({
        where: { bookId: book.id },
        select: { userId: true },
      }),
      prisma.bookFollow.findMany({
        where: { bookId: book.id },
        select: { userId: true },
      }),
      prisma.book.findUnique({
        where: { id: book.id },
        select: { ownerId: true },
      }),
    ]);

    const followerIds = new Set<string>(followers.map((f) => f.userId));

    const recipients = new Set<string>();
    if (owner?.ownerId) recipients.add(owner.ownerId);
    collabs.forEach((c) => recipients.add(c.userId));
    followerIds.forEach((id) => recipients.add(id));

    // Автор получает уведомление ТОЛЬКО если он подписан на книгу
    if (!followerIds.has(userId)) {
      recipients.delete(userId);
    }

    // 2) сложить событие в очередь
    await queueEvent({
      kind: "chapter.published",
      actorId: userId,
      target: { type: "chapter", id: created.id },
      recipients: [...recipients],
      payload: {
        bookId: book.id,
        bookSlug: slug,
        chapterIndex: created.index,
      },
    });

    // 3) SSE: событие публикации для live-списка
    await emit("chapter:published", {
      slug,
      index: created.index,
      chapterId: created.id,
      at: Date.now(),
    });

    // 4) На деве — авто-дренаж, чтобы сразу увидеть уведомление
    if (process.env.NODE_ENV !== "production") {
      await drainOutbox({ limit: 100 });
    }
  }

  return Response.json(created, { status: 201 });
}
