// src/app/api/books/[slug]/chapters/[id]/close/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { getRole } from "@/server/access";
import { emit } from "@/server/events";

const AWARD_EURODOLLARS_ON_CLOSE = 50; // MVP: сколько €$ дать за закрытие главы

type Ctx = { params: Promise<{ slug: string; id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { slug, id } = await params;


  // 1) Session
  const session = await getServerSession(authOptions);
  const userId =
    (session?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = userId; // ✅ теперь uid: string


  // 2) Chapter + Book
  const chapter = await prisma.chapter.findFirst({
    where: { id, book: { slug } },
    select: {
      id: true,
      index: true,
      status: true,
      isDraft: true,
      publishedAt: true,
      book: { select: { id: true, ownerId: true } },
    },
  });

  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  // 3) Permission: book OWNER or EDITOR
  const isOwner = userId === chapter.book.ownerId;
  const role = await getRole(userId, chapter.book.id);

  if (!isOwner && role !== "EDITOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4) Guard: draft нельзя закрывать
  if (chapter.isDraft || !chapter.publishedAt) {
    return NextResponse.json(
      { error: "Cannot close draft chapter" },
      { status: 409 }
    );
  }

  // 5) Close + award €$ атомарно
  // 5) Close + award €$ атомарно
  const result = await prisma.$transaction(async (tx) => {
    const now = new Date();

    // A) Первый complete: OPEN + completedAt=null → CLOSED + completedAt=now + награда
    const first = await tx.chapter.updateMany({
      where: { id: chapter.id, status: "OPEN", completedAt: null },
      data: { status: "CLOSED", completedAt: now },
    });

    if (first.count === 1) {
      await tx.wallet.upsert({
        where: { userId: uid },
        create: { userId: uid, eurodollars: AWARD_EURODOLLARS_ON_CLOSE },
        update: { eurodollars: { increment: AWARD_EURODOLLARS_ON_CLOSE } },
      });

      return { ok: true as const, awarded: AWARD_EURODOLLARS_ON_CLOSE };
    }

    // B) Повторный complete после paid re-open: OPEN + completedAt!=null → CLOSED без награды
    const repeat = await tx.chapter.updateMany({
      where: { id: chapter.id, status: "OPEN", completedAt: { not: null } },
      data: { status: "CLOSED" },
    });

    if (repeat.count === 1) {
      return { ok: true as const, awarded: 0 };
    }

    // C) Уже CLOSED / конкурентный запрос
    return { ok: false as const, awarded: 0 };
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "Chapter already closed" },
      { status: 409 }
    );
  }

  // 🟠 SSE: chapter closed
  emit("chapter:closed", {
    slug,
    index: chapter.index,
    chapterId: chapter.id,
    status: "CLOSED",
    at: Date.now(),
  });

return NextResponse.json({
  success: true,
  status: "CLOSED",
  awardedEurodollars: result.awarded,
});
}