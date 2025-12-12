import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { CreateCategory } from "@/server/schemas";
import { getCategories } from "@/server/repos/forum";

export async function GET() {
  // lazy seed (как было), НЕ трогаем твою логику
  const count = await prisma.forumCategory.count();
  if (count === 0) {
    await prisma.forumCategory.createMany({
      data: [
        { slug: "announcements", title: "Announcements", desc: "Project news & updates" },
        { slug: "lore",          title: "Lore",          desc: "World-building, canon, meta" },
        { slug: "offtopic",      title: "Offtopic",      desc: "Anything else" },
      ],
      skipDuplicates: true,
    });
  }
  const categories = await getCategories();
  return Response.json(categories);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateCategory.safeParse(body);
  if (!parsed.success) return new Response("Bad Request", { status: 400 });

  // создаём напрямую (репозитория тут не нужно, логика простая)
  const { title, desc } = parsed.data;
  const base = (title || "category")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  let slug = base || "category";

  for (let i = 0; i < 3; i++) {
    try {
      const cat = await prisma.forumCategory.create({ data: { slug, title, desc } });
      return Response.json(cat, { status: 201 });
    } catch {
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }
  }
  return new Response("Cannot create category", { status: 500 });
}
