// src/app/api/forum/categories/[category]/threads/[slug]/posts/route.ts
import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { emit } from "@/server/events";
import { isPlayer } from "@/server/player";

type Ctx = { params: Promise<{ category: string; slug: string }> };

// ✅ Non-player может писать посты только в этих категориях (подстрой под свои slug’и)
const RESTRICTED_CAN_POST_CATEGORIES = new Set<string>([
  "offtopic"
]);

export async function GET(req: NextRequest, { params }: Ctx) {
  const { category, slug } = await params;

  const thread = await prisma.forumThread.findFirst({
    where: { slug, category: { slug: category } },
    select: { id: true },
  });
  if (!thread) return NextResponse.json({ error: "thread_not_found" }, { status: 404 });

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const take = Math.min(Number(url.searchParams.get("take") ?? 30), 100);

  const posts = await prisma.forumPost.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      markdown: true,
      authorId: true,
      author: {
        select: {
          id: true,
          username: true,
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  let nextCursor: string | null = null;
  if (posts.length > take) {
    const last = posts.pop()!;
    nextCursor = last.id;
  }

  return NextResponse.json({ items: posts, nextCursor });
}

const CreatePost = z.object({
  content: z.string().trim().min(1).max(20_000),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const { category, slug } = await params;

  const session = await getServerSession(authOptions);
  const userId =
    ((session as any)?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined);

  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // ✅ Мягкий режим: non-player может писать только в allowlist категориях
  const player = await isPlayer(userId);
  if (!player && !RESTRICTED_CAN_POST_CATEGORIES.has(category)) {
    return NextResponse.json({ error: "player_required" }, { status: 403 });
  }

  const thread = await prisma.forumThread.findFirst({
    where: { slug, category: { slug: category } },
    select: { id: true },
  });
  if (!thread) return NextResponse.json({ error: "thread_not_found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = CreatePost.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { content } = parsed.data;

  const post = await prisma.forumPost.create({
    data: {
      threadId: thread.id,
      authorId: userId,
      content: { type: "markdown", value: content },
      markdown: content,
    },
    select: { id: true, threadId: true, createdAt: true },
  });

  emit("thread:new_post", {
    threadId: post.threadId,
    category,
    slug,
    postId: post.id,
    at: Date.now(),
  });

  return NextResponse.json(post, { status: 201 });
}
