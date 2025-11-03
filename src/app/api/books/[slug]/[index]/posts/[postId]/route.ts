// src/app/api/books/[slug]/[index]/posts/[postId]/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { emit } from "@/server/events";

type Ctx = { params: Promise<{ slug: string; index: string; postId: string }> };

const PatchSchema = z.object({
  contentMd: z.string().min(1).max(50_000),
});

function toIdx(v: string) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function getChapterBySlugIndex(slug: string, index: number) {
  return prisma.chapter.findFirst({
    where: { book: { slug }, index },
    select: { id: true, bookId: true, book: { select: { ownerId: true } } },
  });
}

async function getPostInChapter(chapterId: string, postId: string) {
  return prisma.chapterPost.findFirst({
    where: { id: postId, chapterId },
    select: { id: true, authorId: true },
  });
}

// PATCH: редактировать свой пост (или OWNER книги)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { slug, index, postId } = await params;

  const idx = toIdx(index);
  if (!idx) return new Response("Bad index", { status: 400 });

  const session = await getServerSession(authOptions);
  const me =
    (session?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined);
  if (!me) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return new Response("Bad Request", { status: 400 });

  const chapter = await getChapterBySlugIndex(slug, idx);
  if (!chapter) return new Response("Not found", { status: 404 });

  const post = await getPostInChapter(chapter.id, postId);
  if (!post) return new Response("Not found", { status: 404 });

  const isOwner = me === chapter.book.ownerId;
  const isAuthor = me === post.authorId;
  if (!isOwner && !isAuthor) return new Response("Forbidden", { status: 403 });

  const updated = await prisma.chapterPost.update({
    where: { id: post.id },
    data: { contentMd: parsed.data.contentMd, editedAt: new Date() },
    select: {
      id: true,
      contentMd: true,
      editedAt: true,
    },
  });

  // 🔴 теперь передаём slug и index — для фильтрации на клиенте
  await emit("chapter:post_updated", {
    slug,
    index: idx,
    chapterId: chapter.id,
    postId: updated.id,
    contentMd: updated.contentMd,
    editedAt: updated.editedAt?.toISOString() ?? null,
  });

  return Response.json({ ok: true, post: updated }, { status: 200 });
}

// DELETE: удалить свой пост (или OWNER книги)
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { slug, index, postId } = await params;

  const idx = toIdx(index);
  if (!idx) return new Response("Bad index", { status: 400 });

  const session = await getServerSession(authOptions);
  const me =
    (session?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined);
  if (!me) return new Response("Unauthorized", { status: 401 });

  const chapter = await getChapterBySlugIndex(slug, idx);
  if (!chapter) return new Response("Not found", { status: 404 });

  const post = await getPostInChapter(chapter.id, postId);
  if (!post) return new Response("Not found", { status: 404 });

  const isOwner = me === chapter.book.ownerId;
  const isAuthor = me === post.authorId;
  if (!isOwner && !isAuthor) return new Response("Forbidden", { status: 403 });

  await prisma.chapterPost.delete({ where: { id: post.id } });

  // пересчитать lastPostAt
  const last = await prisma.chapterPost.findFirst({
    where: { chapterId: chapter.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { createdAt: true },
  });
  await prisma.chapter.update({
    where: { id: chapter.id },
    data: { lastPostAt: last?.createdAt ?? null },
  });

  // 🔴 и здесь — тоже slug и index
  await emit("chapter:post_deleted", {
    slug,
    index: idx,
    chapterId: chapter.id,
    postId,
  });

  return Response.json({ ok: true }, { status: 200 });
}
