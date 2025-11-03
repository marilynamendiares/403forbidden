// src/app/api/books/[slug]/[index]/posts/route.ts
export const runtime = "nodejs";

import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { emit } from "@/server/events";
import { getRole } from "@/server/access";

type Ctx = { params: Promise<{ slug: string; index: string }> };
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

function toInt(v: string) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/books/:slug/:index/posts?cursor=&limit=50
// keyset pagination по (createdAt,id) ASC
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: Ctx) {
  const { slug, index } = await params;
  const idx = toInt(index);
  if (!idx) return new Response("Bad index", { status: 400 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || "50"), PAGE_MAX);
  const cursor = decodeCursor(searchParams.get("cursor"));

  const chapter = await prisma.chapter.findFirst({
    where: { index: idx, book: { slug } },
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
        select: {
          id: true,
          profile: { select: { username: true, avatarUrl: true } },
        },
      },
    },
  });

  const items = rows.slice(0, limit).map((r) => ({
    id: r.id,
    contentMd: r.contentMd,
    createdAt: r.createdAt.toISOString(),
    editedAt: r.editedAt ? r.editedAt.toISOString() : null,
    author: {
      id: r.author.id,
      username: r.author.profile?.username ?? "user",
      avatarUrl: r.author.profile?.avatarUrl ?? null,
    },
  }));

  const last = items[items.length - 1];
  const nextCursor =
    rows.length > limit && last
      ? encodeCursor({
          createdAt: last.createdAt,
          id: last.id,
        })
      : null;

  return Response.json({ items, nextCursor });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/books/:slug/:index/posts  body: { contentMd: string }
// Создаёт пост, обновляет lastPostAt, SSE 'chapter:new_post'
// ─────────────────────────────────────────────────────────────────────────────
const CreatePostSchema = z.object({
  contentMd: z.string().trim().min(1, "Empty content"),
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

  const chapter = await prisma.chapter.findFirst({
    where: { index: idx, book: { slug } },
    select: { id: true, status: true, bookId: true },
  });
  if (!chapter) return new Response("Not found", { status: 404 });

  // если статус задан и он не OPEN — запрещаем постить
  if (chapter.status && chapter.status !== "OPEN") {
    return Response.json({ error: "Chapter is closed" }, { status: 423 });
  }

  // ACL по книге (OWNER/EDITOR/AUTHOR)
  const myRole = await getRole(userId, chapter.bookId);
  if (!myRole || !["OWNER", "EDITOR", "AUTHOR"].includes(myRole)) {
    return new Response("Forbidden", { status: 403 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const post = await tx.chapterPost.create({
      data: {
        chapterId: chapter.id,
        authorId: userId,
        contentMd: parsed.data.contentMd,
      },
      select: {
        id: true,
        contentMd: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            profile: { select: { username: true, avatarUrl: true } },
          },
        },
      },
    });

    // lastPostAt — по времени созданного поста
    await tx.chapter.update({
      where: { id: chapter.id },
      data: { lastPostAt: post.createdAt },
    });

    return post;
  });

  // LIVE: эмит с slug/index — чтобы клиенты могли отфильтровать свой экран
  await emit("chapter:new_post", {
    slug,
    index: idx,
    chapterId: chapter.id,
    post: {
      id: created.id,
      contentMd: created.contentMd,
      createdAt: created.createdAt.toISOString(),
      author: {
        id: created.author.id,
        username: created.author.profile?.username ?? "user",
        avatarUrl: created.author.profile?.avatarUrl ?? null,
      },
    },
  });

  // Возвращаем полный объект поста (на случай, если кто-то захочет не ждать SSE)
  return Response.json(
    {
      ok: true,
      post: {
        id: created.id,
        contentMd: created.contentMd,
        createdAt: created.createdAt.toISOString(),
        author: {
          id: created.author.id,
          username: created.author.profile?.username ?? "user",
          avatarUrl: created.author.profile?.avatarUrl ?? null,
        },
      },
    },
    { status: 201 }
  );
}
