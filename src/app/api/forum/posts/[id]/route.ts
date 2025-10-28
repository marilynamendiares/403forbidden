// src/app/api/forum/posts/[id]/route.ts
import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import type { NextRequest } from "next/server";
import { emit } from "@/server/events";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const post = await prisma.forumPost.findUnique({
    where: { id },
    select: {
      id: true,
      authorId: true,
      threadId: true,
      thread: {
        select: {
          id: true,
          slug: true,
          category: { select: { slug: true } },
        },
      },
    },
  });

  if (!post) return new Response("Not found", { status: 404 });
  if (post.authorId !== userId) return new Response("Forbidden", { status: 403 });

  await prisma.forumPost.delete({ where: { id: post.id } });

  // эмитим с threadId И category/slug — покроет оба типа подписчиков
  emit("thread:post_deleted", {
    threadId: post.thread?.id ?? post.threadId,
    category: post.thread?.category.slug,
    slug: post.thread?.slug,
    postId: post.id,
    at: Date.now(),
  });

  return new Response(null, { status: 204 });
}
