// src/app/api/books/[slug]/chapters/route.ts
import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { requireRole } from "@/server/access"; // для проверки ACL

type Ctx = { params: Promise<{ slug: string }> };

// ─────────────────────────────────────────────────────────────────────────────
// GET: список глав книги
//  • Владелец/коллабораторы видят все главы (включая drafts)
//  • Остальные видят только опубликованные (isDraft=false AND publishedAt != null)
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
      ...(canSeeDrafts
        ? {}
        : {
            isDraft: false,
            publishedAt: { not: null },
          }),
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
//  • Разрешено OWNER и EDITOR
//  • authorId = userId
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
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // Находим книгу
  const book = await prisma.book.findFirst({
  where: { slug },
  select: { id: true, ownerId: true },
  });
  if (!book) return new Response("Book not found", { status: 404 });

  // Проверяем, что пользователь хотя бы EDITOR
  await requireRole(userId, book.id, "EDITOR");

  // Номер новой главы
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
      authorId: userId, // ← ключевое изменение
    },
    select: { id: true, index: true },
  });

  return Response.json(created, { status: 201 });
}
