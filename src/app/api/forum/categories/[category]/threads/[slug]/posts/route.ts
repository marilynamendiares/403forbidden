// src/app/api/forum/categories/[category]/threads/[slug]/posts/route.ts
import { prisma } from "@/server/db";
import { getCategoryPolicyBySlug } from "@/server/repos/forum";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { publish } from "@/features/realtime/server/bus";
import { isPlayer } from "@/server/player";
import { restrictedCanPost, isAdminOnlyCategory } from "@/server/forumAcl";
import { requireAdmin } from "@/server/admin";

type Ctx = { params: Promise<{ category: string; slug: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { category, slug } = await params;

  const thread = await prisma.forumThread.findFirst({
    where: { slug, category: { slug: category } },
    select: { id: true },
  });
  if (!thread) return NextResponse.json({ error: "thread_not_found" }, { status: 404 });

  const url = new URL(req.url);

  const take = Math.min(Number(url.searchParams.get("take") ?? 30), 100);

  // Realtime "tail" mode: fetch posts strictly after (createdAt,id)
  const afterCreatedAt = url.searchParams.get("afterCreatedAt");
  const afterId = url.searchParams.get("afterId");

  const cursor = url.searchParams.get("cursor") ?? undefined;

  const baseSelect = {
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
  } as const;

  // --- Mode A: realtime tail (recommended for SSE-driven updates) ---
  if (afterCreatedAt) {
    const afterDate = new Date(afterCreatedAt);
    if (Number.isNaN(afterDate.getTime())) {
      return NextResponse.json({ error: "bad_afterCreatedAt" }, { status: 400 });
    }

    const posts = await prisma.forumPost.findMany({
      where: {
        threadId: thread.id,
        OR: [
          { createdAt: { gt: afterDate } },
          ...(afterId ? [{ createdAt: { equals: afterDate }, id: { gt: afterId } }] : []),
        ],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take,
      select: baseSelect,
    });

    console.log("[GET posts tail]", {
      category,
      slug,
      threadId: thread.id,
      afterCreatedAt,
      afterId,
      found: posts.length,
      first: posts[0]?.id,
      last: posts[posts.length - 1]?.id,
    });

    return NextResponse.json({ items: posts, nextCursor: null });
  }


  // --- Mode B: classic pagination (older posts) ---
  const posts = await prisma.forumPost.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: baseSelect,
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

// ✅ Posting policy (DB-driven, with slug-based fallback)
const pol = await getCategoryPolicyBySlug(category).catch(() => null);

const vis = (pol?.createPostVisibility ?? null) as
  | "PUBLIC"
  | "MEMBERS"
  | "PLAYERS"
  | "ADMIN"
  | null;

// Fallback for older DB (before migration) or missing record:
const effectiveVis =
  vis ?? (isAdminOnlyCategory(category) ? "ADMIN" : "MEMBERS");

if (effectiveVis === "ADMIN") {
  try {
    requireAdmin(session as any);
  } catch {
    return NextResponse.json({ error: "admin_required" }, { status: 403 });
  }
} else if (effectiveVis === "PLAYERS") {
  const player = await isPlayer(userId);
  if (!player) {
    return NextResponse.json({ error: "player_required" }, { status: 403 });
  }
} else if (effectiveVis === "MEMBERS" || effectiveVis === "PUBLIC") {
  // logged-in already ensured above
  // Fallback behavior (when DB flags are missing) for non-admin categories:
  // if you still want to keep the old allowlist constraint, keep it here:
  if (!vis) {
    const player = await isPlayer(userId);
    if (!player && !restrictedCanPost(category)) {
      return NextResponse.json({ error: "player_required" }, { status: 403 });
    }
  }
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

  await publish("thread:new_post", {
    threadId: post.threadId,
    category,
    slug,
    postId: post.id,
    at: Date.now(),
  });

  return NextResponse.json(post, { status: 201 });
}
