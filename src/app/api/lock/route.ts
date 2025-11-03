export const runtime = "nodejs";
import { NextResponse, type NextRequest } from "next/server";
import { redis, chapterLockKey, CHAPTER_LOCK_TTL_SEC } from "@/server/redis";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

/**
 * Body:
 * {
 *   "resource": "chapter",
 *   "id": "<chapterId>",
 *   "action": "acquire_or_beat" | "release",
 *   "tabId": "<uuid per tab>"
 * }
 */

type SessUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const sUser = (session?.user ?? {}) as SessUser;
  const userId = sUser.id ?? sUser.email ?? "unknown";
  const username = sUser.name ?? sUser.email ?? "user";

  if (!session || !userId || userId === "unknown") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const resource = body?.resource as "chapter";
  const id = String(body?.id ?? "");
  const action: "acquire_or_beat" | "release" = body?.action ?? "acquire_or_beat";
  const tabId: string | undefined = body?.tabId;

  if (resource !== "chapter" || !id) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const key = chapterLockKey(id);
  const now = Date.now();

  // --- RELEASE: только владелец и та же вкладка ---
  if (action === "release") {
    const cur = await redis.get<{ userId: string; username?: string; tabId?: string }>(key);
    if (cur && cur.userId === userId && (!cur.tabId || cur.tabId === tabId)) {
      await redis.del(key);
      return NextResponse.json({ ok: true, released: true });
    }
    return NextResponse.json({ ok: false, released: false });
  }

  // --- ACQUIRE / HEARTBEAT ---
  const cur = await redis.get<{
    userId: string;
    username?: string;
    tabId?: string;
    since: number;
    lastBeat: number;
  }>(key);

  if (!cur) {
    // ставим лок
    const value = {
      userId,
      username,
      tabId, // владелец — текущая вкладка
      since: now,
      lastBeat: now,
    };
    await redis.set(key, value, { nx: true, ex: CHAPTER_LOCK_TTL_SEC });
    const confirm = await redis.get(key);
    if (confirm) {
      return NextResponse.json({ ok: true, locked: true, mine: true });
    }
    const current = await redis.get(key);
    return NextResponse.json(
      { ok: false, locked: true, mine: false, lockedBy: current },
      { status: 423 },
    );
  }

  // тот же пользователь — считаем «моим» в любой вкладке
  if (cur.userId === userId) {
    const nextVal = { ...cur, lastBeat: now }; // tabId владельца не переписываем
    await redis.set(key, nextVal, { xx: true, ex: CHAPTER_LOCK_TTL_SEC });
    return NextResponse.json({ ok: true, locked: true, mine: true });
  }

  // чужой лок
  return NextResponse.json(
    {
      ok: true,
      locked: true,
      mine: false,
      lockedBy: { userId: cur.userId, username: cur.username, since: cur.since },
    },
    { status: 423 },
  );
}
