// src/app/api/books/[slug]/[index]/posts/[postId]/like/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

type Ctx = { params: Promise<{ slug: string; index: string; postId: string }> };

function toIdx(v: string) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { slug, index, postId } = await params;
  const idx = toIdx(index);
  if (!idx) return new Response("Bad index", { status: 400 });

  const session = await getServerSession(authOptions);
  const me =
    (session?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined);
  if (!me) return new Response("Unauthorized", { status: 401 });

  const chapter = await prisma.chapter.findFirst({
    where: { book: { slug }, index: idx },
    select: { id: true },
  });
  if (!chapter) return new Response("Not found", { status: 404 });

  const post = await prisma.chapterPost.findFirst({
    where: { id: postId, chapterId: chapter.id },
    select: { id: true, authorId: true },
  });
  if (!post) return new Response("Not found", { status: 404 });

  if (post.authorId === me) {
    return new Response("Cannot like your own post", { status: 409 });
  }

  await prisma.chapterPostLike.upsert({
    where: { userId_postId: { userId: me, postId } },
    create: { userId: me, postId },
    update: {},
  });

  const likesCount = await prisma.chapterPostLike.count({ where: { postId } });
  return Response.json({ ok: true, liked: true, likesCount }, { status: 200 });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { slug, index, postId } = await params;
  const idx = toIdx(index);
  if (!idx) return new Response("Bad index", { status: 400 });

  const session = await getServerSession(authOptions);
  const me =
    (session?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined);
  if (!me) return new Response("Unauthorized", { status: 401 });

  const chapter = await prisma.chapter.findFirst({
    where: { book: { slug }, index: idx },
    select: { id: true },
  });
  if (!chapter) return new Response("Not found", { status: 404 });

  const post = await prisma.chapterPost.findFirst({
    where: { id: postId, chapterId: chapter.id },
    select: { id: true },
  });
  if (!post) return new Response("Not found", { status: 404 });

  await prisma.chapterPostLike
    .delete({ where: { userId_postId: { userId: me, postId } } })
    .catch(() => null);

  const likesCount = await prisma.chapterPostLike.count({ where: { postId } });
  return Response.json({ ok: true, liked: false, likesCount }, { status: 200 });
}
