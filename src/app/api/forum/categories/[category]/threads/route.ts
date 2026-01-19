import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { CreateThread } from "@/server/schemas";
import { getThreadsByCategory, createThread, getCategoryPolicyBySlug } from "@/server/repos/forum";
import { requirePlayer } from "@/server/player";
import { requireAdmin } from "@/server/admin";
import { isAdminOnlyCategory } from "@/server/forumAcl";


type Ctx = { params: Promise<{ category: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { category } = await params;
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const take = Math.min(Number(url.searchParams.get("take") ?? 20), 50);

  const { items, nextCursor } = await getThreadsByCategory({
    categorySlug: category,
    take,
    cursorId: cursor,
  });

  // нормализуем даты в строки (если в repo не конвертировали)
  const json = {
    items: items.map((t) => ({
      ...t,
      createdAt: typeof t.createdAt === "string" ? t.createdAt : t.createdAt.toISOString(),
      updatedAt: typeof t.updatedAt === "string" ? t.updatedAt : t.updatedAt.toISOString(),
    })),
    nextCursor,
  };

  return NextResponse.json(json);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { category } = await params;

  const session = await getServerSession(authOptions);
  const userId =
    ((session as any)?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined);

  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

// ✅ Thread creation policy (DB-driven, with slug-based fallback)
const pol = await getCategoryPolicyBySlug(category).catch(() => null);

const vis = (pol?.createThreadVisibility ?? null) as
  | "PUBLIC"
  | "MEMBERS"
  | "PLAYERS"
  | "ADMIN"
  | null;

// Fallback for older DB (before migration) or missing record:
const effectiveVis =
  vis ?? (isAdminOnlyCategory(category) ? "ADMIN" : "PLAYERS");

if (effectiveVis === "ADMIN") {
  try {
    requireAdmin(session as any);
  } catch {
    return NextResponse.json({ error: "admin_required" }, { status: 403 });
  }
} else if (effectiveVis === "PLAYERS") {
  try {
    await requirePlayer(userId);
  } catch {
    return NextResponse.json({ error: "player_required" }, { status: 403 });
  }
}
// MEMBERS/PUBLIC -> login is enough (already checked by userId)



const body = await req.json().catch(() => null);
const parsed = CreateThread.safeParse(body);
if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

const thread = await createThread({
  categorySlug: category,
  authorId: userId,
  title: parsed.data.title,
  // content может отсутствовать или быть пустым — repo сам решит, создавать пост или нет
  content: (parsed.data as any).content ?? null,
});

return NextResponse.json(thread, { status: 201 });
}
