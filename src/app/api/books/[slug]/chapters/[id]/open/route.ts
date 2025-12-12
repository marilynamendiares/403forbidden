// src/app/api/books/[slug]/chapters/[id]/open/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { getRole } from "@/server/access";
import { emit } from "@/server/events";

export async function POST(
  _req: NextRequest,
  context: { params: { slug: string; id: string } }
) {
  const { slug, id } = context.params;

  // 1) Сессия
  const session = await getServerSession(authOptions);
  const userId =
    (session?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Ищем главу + книгу
const chapter = await prisma.chapter.findFirst({
  where: { id, book: { slug } },
  select: {
    id: true,
    index: true,
    status: true,
    book: { select: { id: true, ownerId: true } },
  },
});


  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  const isOwner = userId === chapter.book.ownerId;
  const role = await getRole(userId, chapter.book.id);

  // 3) Право открывать: OWNER или EDITOR
  if (!isOwner && role !== "EDITOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4) Уже открыта → 409
  if (chapter.status === "OPEN") {
    return NextResponse.json(
      { error: "Chapter already open" },
      { status: 409 }
    );
  }

  // 5) Обновляем статус
  const updated = await prisma.chapter.update({
    where: { id: chapter.id },
    data: { status: "OPEN" },
    select: { id: true, status: true },
  });

  // 🟢 SSE: глава открыта
  emit("chapter:opened", {
    slug,
    index: chapter.index,
    chapterId: chapter.id,
    status: updated.status,
    at: Date.now(),
  });

  return NextResponse.json({ success: true, status: updated.status });
}
