// src/server/repos/forum.ts
import { prisma } from "@/server/db";
import { userAuthorSelect } from "@/server/fragments";
import { toAuthorDTO } from "@/server/dto";

export async function getThreadsByCategory(params: {
  categorySlug: string;
  take: number;
  cursorId?: string;
}) {
  const cat = await prisma.forumCategory.findUnique({
    where: { slug: params.categorySlug },
    select: { id: true },
  });
  if (!cat) return { items: [], nextCursor: null };

  const rows = await prisma.forumThread.findMany({
    where: { categoryId: cat.id },
    orderBy: { createdAt: "desc" },
    take: params.take + 1,
    ...(params.cursorId ? { cursor: { id: params.cursorId }, skip: 1 } : {}),
    select: {
      id: true,
      slug: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      author: { select: userAuthorSelect },
      _count: { select: { posts: true } },
    },
  });

  const items = rows.slice(0, params.take).map(r => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    author: toAuthorDTO(r.author),
    _count: r._count,
  }));

  const nextCursor =
    rows.length > params.take ? rows[rows.length - 1].id : null;

  return { items, nextCursor };
}

// + добавить в существующий файл:

export async function getCategories() {
  return prisma.forumCategory.findMany({
    orderBy: { title: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      desc: true,
      readVisibility: true,
      createThreadVisibility: true,
      createPostVisibility: true,
      _count: { select: { threads: true } },
    },
  });
}

export async function getCategoryPolicyBySlug(slug: string) {
  return prisma.forumCategory.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      // these fields exist after migration
      readVisibility: true,
      createThreadVisibility: true,
      createPostVisibility: true,
    },
  });
}

export async function createThread(params: {
  categorySlug: string;
  authorId: string;
  title: string;
  content?: string | null;
}) {
  const { categorySlug, authorId, title } = params;
  const content = (params.content ?? "").trim();

  const cat = await prisma.forumCategory.findUnique({
    where: { slug: categorySlug },
    select: { id: true },
  });
  if (!cat) throw new Error("Category not found");

  const base = (title || "thread")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  let slug = base || "thread";

  for (let i = 0; i < 3; i++) {
    try {
      const t = await prisma.forumThread.create({
        data: {
          categoryId: cat.id,
          authorId,
          title,
          slug,
          ...(content
            ? {
                posts: {
                  create: {
                    authorId,
                    content: { type: "markdown", value: content },
                    markdown: content,
                  },
                },
              }
            : {}),
        },
        select: { id: true, slug: true },
      });
      return t;
    } catch {
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }
  }
  throw new Error("Cannot create thread");
}

