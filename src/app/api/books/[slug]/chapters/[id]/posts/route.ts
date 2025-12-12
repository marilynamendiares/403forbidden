// src/app/api/books/[slug]/chapters/[id]/posts/route.ts
export const runtime = "nodejs";

import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { emit } from "@/server/events";
import { sanitizeHtml } from "@/server/render/sanitizeHtml";

type Ctx = { params: Promise<{ slug: string; id: string }> };

const PAGE_MAX = 100;

function encodeCursor(c: { createdAt: string; id: string }) {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}
function decodeCursor(token: string | null) {
  if (!token) return null;
  try {
    return JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as {
      createdAt: string;
      id: string;
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACL helper: может ли user постить в эту главу (OWNER/EDITOR/AUTHOR по книге)
// ─────────────────────────────────────────────────────────────────────────────
async function canPostInChapter(userId: string, chapterId: string) {
  const ch = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { bookId: true, book: { select: { ownerId: true } } },
  });
  if (!ch) return false;
  if (ch.book.ownerId === userId) return true;

  const collab = await prisma.collaborator.findFirst({
    where: {
      bookId: ch.bookId,
      userId,
      role: { in: ["OWNER", "EDITOR", "AUTHOR"] as any },
    },
    select: { id: true },
  });
  return !!collab;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/books/:slug/chapters/:id/posts?cursor=…&limit=50
// keyset pagination: (createdAt,id) ASC
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: Ctx) {
  const { slug, id } = await params;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || "50"), PAGE_MAX);
  const cursorToken = searchParams.get("cursor");
  const cursor = decodeCursor(cursorToken);

  const chapter = await prisma.chapter.findFirst({
    where: { id, book: { slug } },
    select: { id: true },
  });
  if (!chapter) return new Response("Not found", { status: 404 });

  const where = cursor
    ? {
        chapterId: chapter.id,
        OR: [
          { createdAt: { gt: new Date(cursor.createdAt) } },
          {
            AND: [
              { createdAt: { equals: new Date(cursor.createdAt) } },
              { id: { gt: cursor.id } },
            ],
          },
        ],
      }
    : { chapterId: chapter.id };

  const rows = await prisma.chapterPost.findMany({
    where,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit + 1,
    select: {
      id: true,
      contentMd: true,
      contentHtml: true, // 🆕 canonical HTML
      createdAt: true,
      editedAt: true,
      author: {
        select: {
          id: true,
          email: true,
          username: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      },
    },
  });


const items = rows.slice(0, limit).map((r) => {
  // 🆕 если в БД уже есть contentHtml — считаем его каноном,
  // иначе используем старый contentMd как fallback
  const bodyHtml = r.contentHtml ?? r.contentMd;

  return {
    id: r.id,
    contentMd: bodyHtml, // наружу по-прежнему зовётся contentMd
    createdAt: r.createdAt,
    editedAt: r.editedAt,
    author: {
      id: r.author.id,
      username: r.author.username ?? "user",
      displayName: r.author.profile?.displayName ?? null,
      avatarUrl: r.author.profile?.avatarUrl ?? null,
    },
  };
});


  const last = items[items.length - 1];
  const nextCursor =
    rows.length > limit && last
      ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
      : null;

  return Response.json({ items, nextCursor });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/books/:slug/chapters/:id/posts  body: { contentMd: string }
// Создаёт пост, обновляет lastPostAt, эмитит SSE 'chapter:new_post'
// ─────────────────────────────────────────────────────────────────────────────
const CreatePostSchema = z.object({
  contentMd: z.string().trim().min(1, "Empty content"),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const { slug, id } = await params;

  const session = await getServerSession(authOptions);
  const userId =
    (session?.user?.id ?? (session as any)?.userId) as string | undefined;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // ↓↓↓ ВОТ ЗДЕСЬ НАЧИНАЕТСЯ НОВЫЙ БЛОК ↓↓↓

  const parse = CreatePostSchema.safeParse(await req.json().catch(() => null));
  if (!parse.success) {
    return Response.json({ error: "Bad Request" }, { status: 400 });
  }

  const chapter = await prisma.chapter.findFirst({
    where: { id, book: { slug } },
    select: { id: true, status: true },
  });
  if (!chapter) return new Response("Not found", { status: 404 });
  if (chapter.status !== "OPEN") {
    return Response.json({ error: "Chapter is closed" }, { status: 423 });
  }

  if (!(await canPostInChapter(userId, chapter.id))) {
    return new Response("Forbidden", { status: 403 });
  }

  // сырой HTML, который пришёл от редактора
  const rawHtml = parse.data.contentMd;
  // пропускаем через серверный sanitizer
  const safeHtml = sanitizeHtml(rawHtml);

  const created = await prisma.$transaction(async (tx) => {
    const post = await tx.chapterPost.create({
      data: {
        chapterId: chapter.id,
        authorId: userId,
        // храним оба варианта: сырой и санитизированный
        contentMd: rawHtml,
        contentHtml: safeHtml,
      },
      select: {
        id: true,
        contentMd: true,
        contentHtml: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            email: true,
            username: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    await tx.chapter.update({
      where: { id: chapter.id },
      data: { lastPostAt: new Date() },
    });

    return post;
  });

  // наружу (SSE) уже отдаём безопасный HTML
  await emit("chapter:new_post", {
    chapterId: chapter.id,
    post: {
      id: created.id,
      contentMd: created.contentHtml ?? created.contentMd,
      createdAt: created.createdAt.toISOString(),
    },
    author: {
      id: created.author.id,
      username: created.author.username ?? "user",
      displayName: created.author.profile?.displayName ?? null,
      avatarUrl: created.author.profile?.avatarUrl ?? null,
    },
  });

  return Response.json({ ok: true, id: created.id }, { status: 201 });
}
