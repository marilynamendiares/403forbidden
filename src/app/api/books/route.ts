// src/app/api/books/route.ts
import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
// import { requireRole } from "@/server/access"; // (не используется здесь)
import { z } from "zod";
import { slugify } from "@/lib/slug";
import type { NextRequest } from "next/server";
import { emit } from "@/server/events"; // 🆕 добавили

// Список книг
export async function GET(_req: NextRequest) {
  const books = await prisma.book.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      slug: true,
      title: true,
      createdAt: true,
      status: true,
    },
  });
  return Response.json(books);
}

const CreateSchema = z.object({
  title: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(200).optional(),
});

// Создание книги
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return new Response("Bad Request", { status: 400 });

  const { title, tagline } = parsed.data;

  const base = slugify(title);
  let slug = base || "book";

  // Уникальность в схеме: @@unique([ownerId, slug])
  // Поэтому проверяем коллизию только в пределах ownerId.
  for (let i = 0; i < 4; i++) {
    try {
      const created = await prisma.book.create({
        data: {
          ownerId: userId,
          title,
          slug,
          tagline: tagline ?? null,
        },
        select: { id: true, slug: true, title: true }, // 🆕 вернём id/title — пригодится
      });

      // 🟢 SSE: сообщаем списку книг, что появилась новая
      emit("book:created", {
        id: created.id,
        slug: created.slug,
        title: created.title,
        at: Date.now(),
      });

      return Response.json(created, { status: 201 });
    } catch (e: any) {
      // потенциальный конфликт уникальности — меняем slug и ретраим
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }
  }

  return new Response("Cannot create book", { status: 500 });
}
