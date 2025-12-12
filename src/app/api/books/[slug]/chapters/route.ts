// src/app/api/books/[slug]/chapters/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { z } from "zod";
import type { NextRequest } from "next/server";
import {
  listChaptersForViewer,
  createChapterForUser,
  HttpError,
} from "@/server/services/chapters";

type Ctx = { params: Promise<{ slug: string }> };

// ─────────────────────────────────────────────────────────────────────────────
// GET: список глав книги
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { slug } = await params;

  const session = await getServerSession(authOptions);
  const viewerId = (session as any)?.userId as string | undefined;

  const result = await listChaptersForViewer({ slug, viewerId });
  if (!result) return new Response("Not found", { status: 404 });

  // контракт ответа сохраняем как был
  return Response.json({
    book: { title: result.book.title },
    chapters: result.chapters,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST: создать главу
// ─────────────────────────────────────────────────────────────────────────────
const CreateSchema = z.object({
  title: z.string().trim().min(2).max(140),
  content: z.string().trim().min(1),
  publish: z.boolean().optional(),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const { slug } = await params;

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return new Response("Bad Request", { status: 400 });

  const session = await getServerSession(authOptions);
  const userId =
    (session?.user?.id ?? (session as any)?.userId) as string | undefined;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const created = await createChapterForUser({
      slug,
      userId,
      title: parsed.data.title,
      content: parsed.data.content,
      publish: parsed.data.publish,
    });

    return Response.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof HttpError) {
      return new Response(e.message, { status: e.status });
    }
    console.error("Failed to create chapter", e);
    return new Response("Internal error", { status: 500 });
  }
}
