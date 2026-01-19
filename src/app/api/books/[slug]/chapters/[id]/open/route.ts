// src/app/api/books/[slug]/chapters/[id]/open/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { getRole } from "@/server/access";
import { emit } from "@/server/events";

const REOPEN_PENALTY = 10;

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

  // 2) Chapter + Book
  const chapter = await prisma.chapter.findFirst({
    where: { id, book: { slug } },
    select: {
      id: true,
      index: true,
      status: true,
      completedAt: true,
      isDraft: true,
      publishedAt: true,
      book: { select: { id: true, ownerId: true } },
    },
  });

  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  const isOwner = userId === chapter.book.ownerId;
  const role = await getRole(userId, chapter.book.id);

  // 3) Permission: OWNER or EDITOR
  if (!isOwner && role !== "EDITOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4) Already open
  if (chapter.status === "OPEN") {
    return NextResponse.json(
      { error: "Chapter already open" },
      { status: 409 }
    );
  }

  // 5) Optional: draft reopen смысла не имеет (можно запретить)
  // Если хочешь разрешать — убери этот блок.
  if (chapter.isDraft || !chapter.publishedAt) {
    return NextResponse.json(
      { error: "Cannot reopen draft chapter" },
      { status: 409 }
    );
  }

  // 6) Если глава уже была completed хоть раз — re-open платный
  if (chapter.completedAt) {
    const res = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
        create: { userId },
        update: {},
        select: { eurodollars: true },
      });

      if (wallet.eurodollars < REOPEN_PENALTY) {
        return { ok: false as const, error: "NOT_ENOUGH_FUNDS" as const, eurodollars: wallet.eurodollars };
      }

      await tx.wallet.update({
        where: { userId },
        data: { eurodollars: { decrement: REOPEN_PENALTY } },
      });

      const updated = await tx.chapter.update({
        where: { id: chapter.id },
        data: { status: "OPEN" },
        select: { id: true, status: true },
      });

      return { ok: true as const, updated, penalty: REOPEN_PENALTY };
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Not enough eurodollars", code: res.error, eurodollars: res.eurodollars, required: REOPEN_PENALTY },
        { status: 409 }
      );
    }

    emit("chapter:opened", {
      slug,
      index: chapter.index,
      chapterId: chapter.id,
      status: res.updated.status,
      at: Date.now(),
    });

    return NextResponse.json({
      success: true,
      status: res.updated.status,
      penaltyEurodollars: res.penalty,
    });
  }

  // 7) Если completedAt ещё не было — можно открыть бесплатно (редкий кейс, но оставим)
  const updated = await prisma.chapter.update({
    where: { id: chapter.id },
    data: { status: "OPEN" },
    select: { id: true, status: true },
  });

  emit("chapter:opened", {
    slug,
    index: chapter.index,
    chapterId: chapter.id,
    status: updated.status,
    at: Date.now(),
  });

  return NextResponse.json({ success: true, status: updated.status });
}
