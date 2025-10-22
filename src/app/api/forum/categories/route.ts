import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { z } from "zod";
import { slugify } from "@/lib/slug";

export async function GET() {
  // ленивый сид категорий, если пусто
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

  const categories = await prisma.forumCategory.findMany({
    orderBy: { title: "asc" },
    select: { id: true, slug: true, title: true, desc: true, _count: { select: { threads: true } } },
  });

  return Response.json(categories);
}

const CreateCategory = z.object({
  title: z.string().trim().min(2).max(64),
  desc: z.string().trim().max(300).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateCategory.safeParse(body);
  if (!parsed.success) return new Response("Bad Request", { status: 400 });

  const { title, desc } = parsed.data;
  const slugBase = slugify(title);
  // гарантируем уникальность в случае коллизии
  let slug = slugBase || "category";
  for (let i = 0; i < 3; i++) {
    try {
      const cat = await prisma.forumCategory.create({ data: { slug, title, desc } });
      return Response.json(cat, { status: 201 });
    } catch {
      slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
    }
  }
  return new Response("Cannot create category", { status: 500 });
}
