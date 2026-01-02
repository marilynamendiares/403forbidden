// src/app/api/admin/characters/route.ts
export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/admin";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  try {
    requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Достаём все анкеты (пока без пагинации)
  const rows = await prisma.characterApplication.findMany({
    orderBy: [{ lastSubmittedAt: "desc" }, { updatedAt: "desc" }], // первично — сабмит, иначе — апдейт
    select: {
      id: true,
      name: true,
      status: true,
      updatedAt: true,
      createdAt: true,
      lastSubmittedAt: true,
      moderatorNote: true,
      moderatorId: true,
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      },
    },
  });

  // Группировка
  const IN_REVIEW_SET = new Set(["SUBMITTED", "UNDER_REVIEW"] as const);

  const inReview: typeof rows = [];
  const other: typeof rows = [];

  for (const r of rows) {
    if (IN_REVIEW_SET.has(r.status as any)) inReview.push(r);
    else other.push(r);
  }

  return NextResponse.json({
    items: rows, // на всякий оставим совместимость
    groups: {
      inReview,
      other,
    },
  });
}
