// src/app/api/notifications/route.ts
import { NextRequest } from "next/server";
import {
  listNotificationsForUser,
  applyNotificationOp,
} from "@/server/services/notifications";
import { getSessionViewer } from "@/server/session";
import { error, json } from "@/server/http";

// GET /api/notifications
// ?limit=&cursor=      -> { items, nextCursor }
export async function GET(req: NextRequest) {
  const { userId } = await getSessionViewer();
  if (!userId) {
    return json({ items: [], nextCursor: null });
  }

  const { searchParams } = new URL(req.url);

  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
  const cursor = searchParams.get("cursor") || null;

  const { items, nextCursor } = await listNotificationsForUser({
    userId,
    limit,
    cursor,
  });

  return json({ items, nextCursor });
}

// POST /api/notifications
// { op: "mark-one", id } | { op: "mark-all" } | { op: "clear-all" }
export async function POST(req: NextRequest) {
  const { userId } = await getSessionViewer();
  if (!userId) {
    return error("Unauthorized", 401);
  }

  const body = (await req.json().catch(() => null)) as
    | { op: "mark-one"; id: string }
    | { op: "mark-all" }
    | { op: "clear-all" }
    | null;

  if (!body || !("op" in body)) {
    return error("Bad Request", 400);
  }

  try {
    const { unread } = await applyNotificationOp(userId, body);
    return json({ ok: true, unread }, { status: 200 });
  } catch (e) {
    console.error("Failed to apply notification op", e);
    return error("Internal error", 500);
  }
}
