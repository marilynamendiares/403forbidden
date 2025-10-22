import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { z } from "zod";
import { slugify } from "@/lib/slug";

type Params = { params: { category: string } };

export async function GET(_: Request, { params }: Params) {
  const category = await prisma.forumCategory.findUnique({
    where: { slug: params.category },
    select: { id: true },
  });
  if (!category) return new Response("Category not found", { status: 404 });

  const url = new URL(_.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const take = Math.min(Number(url.searchParams.get("take") ?? 20), 50);

  const threads = await prisma.forumThread.findMany({
    where: { categoryId: category.id },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true, slug: true, title: true, createdAt: true, updatedAt: true,
      author: { select: { id: true, profile: { select: { username: true, displayName: true } } } },
      _count: { select: { posts: true } },
    },
  });

  let nextCursor: string | null = null;
  if (threads.length > take) {
    const last = threads.pop()!;
    nextCursor = last.id;
  }

  return Response.json({ items: threads, nextCursor });
}

const CreateThread = z.object({
  title: z.string().trim().min(2).max(140),
  content: z.string().trim().min(1).max(20_000),
});

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const category = await prisma.forumCategory.findUnique({
    where: { slug: params.category },
    select: { id: true },
  });
  if (!category) return new Response("Category not found", { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = CreateThread.safeParse(body);
  if (!parsed.success) return new Response("Bad Request", { status: 400 });

  const { title, content } = parsed.data;

  const base = slugify(title);
  let slug = base || "thread";
  for (let i = 0; i < 3; i++) {
    try {
      const thread = await prisma.forumThread.create({
        data: {
          categoryId: category.id,
          authorId: userId,
          title,
          slug,
          posts: {
            create: { authorId: userId, content: { type: "markdown", value: content }, markdown: content },
          },
        },
        select: { id: true, slug: true },
      });
      return Response.json(thread, { status: 201 });
    } catch {
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }
  }
  return new Response("Cannot create thread", { status: 500 });
}
