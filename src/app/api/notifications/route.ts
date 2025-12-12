// src/app/api/notifications/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { NextRequest, NextResponse } from "next/server";
import {
  getUnreadCount,
  listNotificationsForUser,
  applyNotificationOp,
} from "@/server/services/notifications";

// GET /api/notifications
// ?unread=1            -> { count }
// ?limit=&cursor=      -> { items, nextCursor }
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) {
    // для списка/ленты: просто пустой результат
    return NextResponse.json({ items: [], nextCursor: null });
  }

  const { searchParams } = new URL(req.url);

  // счётчик непрочитанных
  if (searchParams.get("unread")) {
    const count = await getUnreadCount(userId);
    return NextResponse.json({ count });
  }

  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
  const cursor = searchParams.get("cursor") || null;

  const { items, nextCursor } = await listNotificationsForUser({
    userId,
    limit,
    cursor,
  });

  return NextResponse.json({ items, nextCursor });
}

// POST /api/notifications
// { op: "mark-one", id } | { op: "mark-all" } | { op: "clear-all" }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { op: "mark-one"; id: string }
    | { op: "mark-all" }
    | { op: "clear-all" }
    | null;

  if (!body || !("op" in body)) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  try {
    const { unread } = await applyNotificationOp(userId, body);
    return NextResponse.json({ ok: true, unread }, { status: 200 });
  } catch (e) {
    console.error("Failed to apply notification op", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
