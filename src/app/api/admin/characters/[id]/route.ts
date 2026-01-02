export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/admin";

type Ctx = { params: Promise<{ id: string }> };

const selectItem = {
  id: true,
  name: true,
  status: true,
  form: true,
  moderatorNote: true,
  moderatorId: true,
  updatedAt: true,
  lastSubmittedAt: true,
  userId: true,
  user: {
    select: {
      id: true,
      email: true,
      username: true,
      profile: { select: { displayName: true, avatarUrl: true } },
    },
  },
} as const;

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  try {
    requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 1) сначала читаем (с user + form)
  const item = await prisma.characterApplication.findUnique({
    where: { id },
    select: selectItem,
  });

  if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // 2) если только что сабмитнули — переводим в UNDER_REVIEW
  if (item.status === "SUBMITTED") {
    const upd = await prisma.characterApplication.updateMany({
      where: { id, status: "SUBMITTED" }, // атомарная защита
      data: { status: "UNDER_REVIEW" },
    });

    if (upd.count > 0) {
      const item2 = await prisma.characterApplication.findUnique({
        where: { id },
        select: selectItem,
      });
      return NextResponse.json({ item: item2 });
    }
  }

  return NextResponse.json({ item });
}
