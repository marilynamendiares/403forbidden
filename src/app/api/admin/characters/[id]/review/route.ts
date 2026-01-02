export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { requireAdmin } from "@/server/admin";

type Ctx = { params: Promise<{ id: string }> };

const BodySchema = z.object({
  action: z.enum(["APPROVE", "NEEDS_CHANGES"]),
  note: z.string().max(5000).optional(),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const moderatorId = (session as any)?.user?.id ?? (session as any)?.userId;

  try {
    requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!moderatorId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const target = await prisma.characterApplication.findUnique({
    where: { id },
    select: { id: true, status: true, userId: true, name: true },
  });
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // ✅ разрешаем ревью в этих статусах
  if (!["SUBMITTED", "UNDER_REVIEW", "NEEDS_CHANGES"].includes(target.status)) {
    return NextResponse.json({ error: "bad_status" }, { status: 409 });
  }

  const nextStatus = parsed.data.action === "APPROVE" ? "APPROVED" : "NEEDS_CHANGES";
  const note = parsed.data.note?.trim() || null;

  const updated = await prisma.characterApplication.update({
    where: { id },
    data: {
      status: nextStatus,
      moderatorId,
      moderatorNote: note,
    },
    select: { id: true, status: true, updatedAt: true, moderatorId: true, moderatorNote: true },
  });

  // ✅ notify user (best-effort)
  try {
    await prisma.notification.create({
      data: {
        userId: target.userId,
        type: nextStatus === "APPROVED" ? "CHAR_APP_APPROVED" : "CHAR_APP_NEEDS_CHANGES",
        actorId: moderatorId,
        targetType: "CharacterApplication",
        targetId: target.id,
        payload: { name: target.name, note },
        isRead: false,
      },
    });
  } catch {
    // не валим review из-за нотификаций
  }

  return NextResponse.json({ ok: true, item: updated });
}
