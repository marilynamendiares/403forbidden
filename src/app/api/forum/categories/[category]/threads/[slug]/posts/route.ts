import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { z } from "zod";

type Params = { params: { category: string; slug: string } };

export async function GET(_: Request, { params }: Params) {
  const thread = await prisma.forumThread.findFirst({
    where: { slug: params.slug, category: { slug: params.category } },
    select: { id: true },
  });
  if (!thread) return new Response("Thread not found", { status: 404 });

  const posts = await prisma.forumPost.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, createdAt: true, updatedAt: true, markdown: true,
      author: { select: { id: true, profile: { select: { username: true, displayName: true } } } },
    },
  });
  return Response.json(posts);
}

const CreatePost = z.object({
  content: z.string().trim().min(1).max(20_000),
});

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const thread = await prisma.forumThread.findFirst({
    where: { slug: params.slug, category: { slug: params.category } },
    select: { id: true },
  });
  if (!thread) return new Response("Thread not found", { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = CreatePost.safeParse(body);
  if (!parsed.success) return new Response("Bad Request", { status: 400 });

  const { content } = parsed.data;

  const post = await prisma.forumPost.create({
    data: {
      threadId: thread.id,
      authorId: userId,
      content: { type: "markdown", value: content },
      markdown: content,
    },
    select: { id: true },
  });

  return Response.json(post, { status: 201 });
}
