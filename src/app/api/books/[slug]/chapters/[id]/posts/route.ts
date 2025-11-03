// src/app/api/books/[slug]/chapters/[id]/posts/route.ts
export const runtime = "nodejs";

import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { emit } from "@/server/events";

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
  // находим bookId по главе
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

  // подтвердим соответствие главы книге по slug
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
      createdAt: true,
      editedAt: true,
      author: {
        select: { id: true, profile: { select: { username: true, avatarUrl: true } } },
      },
    },
  });

  const items = rows.slice(0, limit).map((r) => ({
    id: r.id,
    contentMd: r.contentMd,
    createdAt: r.createdAt,
    editedAt: r.editedAt,
    author: {
      id: r.author.id,
      username: r.author.profile?.username ?? "user",
      avatarUrl: r.author.profile?.avatarUrl ?? null,
    },
  }));

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

  const parse = CreatePostSchema.safeParse(await req.json().catch(() => null));
  if (!parse.success) {
    return Response.json({ error: "Bad Request" }, { status: 400 });
  }

  // подтянем главу и проверим статус + принадлежность книге
  const chapter = await prisma.chapter.findFirst({
    where: { id, book: { slug } },
    select: { id: true, status: true },
  });
  if (!chapter) return new Response("Not found", { status: 404 });
  if (chapter.status !== "OPEN") {
    return Response.json({ error: "Chapter is closed" }, { status: 423 });
  }

  // ACL: OWNER/EDITOR/AUTHOR по книге
  if (!(await canPostInChapter(userId, chapter.id))) {
    return new Response("Forbidden", { status: 403 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const post = await tx.chapterPost.create({
      data: {
        chapterId: chapter.id,
        authorId: userId,
        contentMd: parse.data.contentMd,
      },
      select: {
        id: true,
        contentMd: true,
        createdAt: true,
        author: {
          select: { id: true, profile: { select: { username: true, avatarUrl: true } } },
        },
      },
    });

    await tx.chapter.update({
      where: { id: chapter.id },
      data: { lastPostAt: new Date() },
    });

    return post;
  });

  // SSE event (минимальный payload)
  await emit("chapter:new_post", {
    chapterId: chapter.id,
    post: {
      id: created.id,
      contentMd: created.contentMd,
      createdAt: created.createdAt.toISOString(),
    },
    author: {
      id: created.author.id,
      username: created.author.profile?.username ?? "user",
      avatarUrl: created.author.profile?.avatarUrl ?? null,
    },
  });

  return Response.json({ ok: true, id: created.id }, { status: 201 });
}
