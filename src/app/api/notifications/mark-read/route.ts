import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? (body.ids as string[]) : [];
  const markAll = !!body?.all;

  if (!markAll && ids.length === 0) {
    return NextResponse.json({ error: "Nothing to mark" }, { status: 400 });
  }

  const where = markAll
    ? { userId, isRead: false }
    : { userId, id: { in: ids } };

  const res = await prisma.notification.updateMany({
    where,
    data: { isRead: true },
  });

  return NextResponse.json({ updated: res.count });
}
