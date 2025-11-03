// src/app/api/books/[slug]/chapters/[id]/route.ts
export const runtime = "nodejs";

import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import type { NextRequest } from "next/server";
import { getRole } from "@/server/access"; // ← заменили requireRole на getRole
import { emit } from "@/server/events";

type Ctx = { params: Promise<{ slug: string; id: string }> };

// PATCH /api/books/:slug/chapters/:id   body: { action: "open" | "close" }
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { slug, id } = await params;

  const session = await getServerSession(authOptions);
  const userId =
    (session?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { action?: "open" | "close" }
    | null;
  const action = body?.action;
  if (action !== "open" && action !== "close") {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  // найдём главу и книгу, чтобы проверить права (OWNER или EDITOR по книге)
  const chapterRow = await prisma.chapter.findFirst({
    where: { id, book: { slug } },
    select: {
      id: true,
      status: true,
      bookId: true,
      book: { select: { ownerId: true, slug: true } },
    },
  });
  if (!chapterRow) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const myRole = (await getRole(userId, chapterRow.bookId)) as
    | "OWNER"
    | "EDITOR"
    | "AUTHOR"
    | "VIEWER"
    | null;
  const isOwner = chapterRow.book.ownerId === userId;

  if (!isOwner && myRole !== "EDITOR") {
    return new Response("Forbidden", { status: 403 });
  }

  const nextStatus = action === "open" ? "OPEN" : "CLOSED";

  // идемпотентность: если уже в нужном статусе — ничего не меняем
  if (chapterRow.status === nextStatus) {
    await emit(`chapter:${nextStatus === "OPEN" ? "opened" : "closed"}`, {
      chapterId: chapterRow.id,
      slug: chapterRow.book.slug,
    });
    return Response.json({ ok: true, status: nextStatus, unchanged: true });
  }

  // обновляем статус
  const updated = await prisma.chapter.update({
    where: { id: chapterRow.id },
    data: { status: nextStatus },
    select: { id: true, status: true },
  });

  // событие для SSE
  await emit(`chapter:${nextStatus === "OPEN" ? "opened" : "closed"}`, {
    chapterId: updated.id,
    slug: chapterRow.book.slug,
  });

  return Response.json({ ok: true, status: updated.status });
}
