// src/app/api/books/[slug]/[index]/posts/[postId]/reputation/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { z } from "zod";

type Ctx = { params: Promise<{ slug: string; index: string; postId: string }> };

const GiveSchema = z.object({
  amount: z.number().int().min(1).max(1).default(1), // MVP: строго 1
});

function toIdx(v: string) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function nextWeeklyReset(from: Date) {
  return new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { slug, index, postId } = await params;
  const idx = toIdx(index);
  if (!idx) return new Response("Bad index", { status: 400 });

  const session = await getServerSession(authOptions);
  const me =
    (session?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined);
  if (!me) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = GiveSchema.safeParse(body ?? {});
  if (!parsed.success) return new Response("Bad Request", { status: 400 });

  const chapter = await prisma.chapter.findFirst({
    where: { book: { slug }, index: idx },
    select: { id: true },
  });
  if (!chapter) return new Response("Not found", { status: 404 });

  const post = await prisma.chapterPost.findFirst({
    where: { id: postId, chapterId: chapter.id },
    select: { id: true, authorId: true },
  });
  if (!post) return new Response("Not found", { status: 404 });

  if (post.authorId === me) {
    return new Response("Cannot give reputation to yourself", { status: 409 });
  }

  const amount = parsed.data.amount;
  const now = new Date();

  const out = await prisma.$transaction(async (tx) => {
    // lazy reset budget
    const giver = await tx.wallet.upsert({
      where: { userId: me },
      create: {
        userId: me,
        eurodollars: 0,
        reputationTotal: 0,
        reputationBudget: 10,
        reputationBudgetMax: 10,
        reputationBudgetResetAt: nextWeeklyReset(now),
      },
      update: {},
    });

    const shouldReset =
      !giver.reputationBudgetResetAt || giver.reputationBudgetResetAt <= now;

    if (shouldReset) {
      await tx.wallet.update({
        where: { userId: me },
        data: {
          reputationBudget: giver.reputationBudgetMax,
          reputationBudgetResetAt: nextWeeklyReset(now),
        },
      });
    }

    const fresh = await tx.wallet.findUnique({
      where: { userId: me },
      select: { reputationBudget: true },
    });
    const budget = fresh?.reputationBudget ?? 0;

    if (budget < amount) {
      return { ok: false as const, reason: "NO_BUDGET" as const, budget };
    }

    const existing = await tx.chapterPostReputationGrant.findUnique({
      where: { fromUserId_postId: { fromUserId: me, postId } },
      select: { id: true },
    });
    if (existing) {
      return { ok: false as const, reason: "ALREADY_GIVEN" as const, budget };
    }

    await tx.chapterPostReputationGrant.create({
      data: { fromUserId: me, toUserId: post.authorId, postId, amount },
    });

    await tx.wallet.update({
      where: { userId: me },
      data: { reputationBudget: { decrement: amount } },
    });

    await tx.wallet.upsert({
      where: { userId: post.authorId },
      create: { userId: post.authorId, reputationTotal: amount },
      update: { reputationTotal: { increment: amount } },
    });

    return { ok: true as const, budgetLeft: budget - amount };
  });

  if (!out.ok) {
    return Response.json({ ok: false, error: out.reason, budget: out.budget }, { status: 409 });
  }

  const repCount = await prisma.chapterPostReputationGrant.aggregate({
    where: { postId },
    _sum: { amount: true },
  });

  return Response.json(
    {
      ok: true,
      given: amount,
      repCount: repCount._sum.amount ?? 0,
      giverBudgetLeft: out.budgetLeft,
    },
    { status: 200 }
  );
}
