// GET /api/notifications/unread-count  -> { count: number }
import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) return NextResponse.json({ count: 0 });

  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return NextResponse.json({ count });
}
