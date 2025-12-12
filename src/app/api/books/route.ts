// src/app/api/books/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { listBooks, createBook } from "@/server/services/books";

// GET /api/books — список книг
export async function GET(_req: NextRequest) {
  const books = await listBooks();
  return Response.json(books);
}

// POST /api/books — создание книги
const CreateSchema = z.object({
  title: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return new Response("Bad Request", { status: 400 });

  try {
    const created = await createBook({
      userId,
      title: parsed.data.title,
      tagline: parsed.data.tagline ?? null,
    });

    return Response.json(created, { status: 201 });
  } catch {
    return new Response("Cannot create book", { status: 500 });
  }
}
