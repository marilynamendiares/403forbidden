import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { CreateThread } from "@/server/schemas";
import { getThreadsByCategory, createThread } from "@/server/repos/forum";
import { requirePlayer } from "@/server/player";

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

  // ✅ Создавать треды можно только полноценным игрокам (approved character)
  try {
    await requirePlayer(userId);
  } catch {
    return NextResponse.json({ error: "player_required" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateThread.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const thread = await createThread({
    categorySlug: category,
    authorId: userId,
    title: parsed.data.title,
    content: parsed.data.content,
  });

  return NextResponse.json(thread, { status: 201 });
}
