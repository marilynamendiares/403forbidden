export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { getAdminUserIds } from "@/server/admin";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const me = (session as any)?.user?.id ?? (session as any)?.userId;
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Атомарно: submit только из DRAFT/NEEDS_CHANGES
  const now = new Date();
  const res = await prisma.characterApplication.updateMany({
    where: {
      id,
      userId: me,
      status: { in: ["DRAFT", "NEEDS_CHANGES"] },
    },
    data: {
      status: "SUBMITTED",
      lastSubmittedAt: now,
      moderatorNote: null, // сбросим старые замечания при (re)submit
      moderatorId: null,   // и автора ревью тоже сбросим
    },
  });

  if (res.count === 0) {
    const exists = await prisma.characterApplication.findFirst({
      where: { id, userId: me },
      select: { id: true, status: true },
    });
    if (!exists) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(
      { error: "bad_status", status: exists.status },
      { status: 409 }
    );
  }

  const updated = await prisma.characterApplication.findFirst({
    where: { id, userId: me },
    select: { id: true, name: true, status: true, updatedAt: true, lastSubmittedAt: true },
  });

  // ✅ notify admins (best-effort)
  try {
    const adminIds = await getAdminUserIds();
    if (adminIds.length && updated) {
      await prisma.notification.createMany({
        data: adminIds.map((adminId) => ({
          userId: adminId,
          type: "CHAR_APP_SUBMITTED",
          actorId: me,
          targetType: "CharacterApplication",
          targetId: updated.id,
          payload: { name: updated.name },
          isRead: false,
        })),
        skipDuplicates: true,
      });
    }
  } catch {
    // не валим submit из-за нотификаций
  }

  return NextResponse.json({ ok: true, item: updated });
}
