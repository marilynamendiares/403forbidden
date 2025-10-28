// src/app/api/books/[slug]/[index]/publish/route.ts
export const runtime = "nodejs";

import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import type { NextRequest } from "next/server";
import { requireRole } from "@/server/access";

type Ctx = { params: Promise<{ slug: string; index: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { slug, index } = await params;

  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 1) {
    return new Response("Bad index", { status: 400 });
  }

  const chapter = await prisma.chapter.findFirst({
    where: { book: { slug }, index: idx },
    select: { id: true, isDraft: true, bookId: true },
  });
  if (!chapter) return new Response("Not found", { status: 404 });

  // По roadmap публиковать могут OWNER и EDITOR
  await requireRole(userId, chapter.bookId, "EDITOR");

  if (!chapter.isDraft) {
    return Response.json({ ok: true, alreadyPublished: true });
  }

  await prisma.chapter.update({
    where: { id: chapter.id },
    data: { isDraft: false, publishedAt: new Date() },
  });

  return Response.json({ ok: true });
}
