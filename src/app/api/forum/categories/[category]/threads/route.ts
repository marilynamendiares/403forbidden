import type { NextRequest } from "next/server";
import { CreateThread } from "@/server/schemas";
import { getThreadsByCategory } from "@/server/repos/forum";
import { isAdminSession } from "@/server/admin";
import { createThreadForUser } from "@/server/services/forum";
import { getSessionViewer } from "@/server/session";
import { getRouteErrorResponse } from "@/server/api";
import { error, json } from "@/server/http";

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

  return json({
    items: items.map((thread) => ({
      ...thread,
      createdAt:
        typeof thread.createdAt === "string"
          ? thread.createdAt
          : thread.createdAt.toISOString(),
      updatedAt:
        typeof thread.updatedAt === "string"
          ? thread.updatedAt
          : thread.updatedAt.toISOString(),
    })),
    nextCursor,
  });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { category } = await params;
  const { session, userId } = await getSessionViewer();
  if (!userId || !session) return error("unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = CreateThread.safeParse(body);
  if (!parsed.success) return error("bad_request", 400);

  try {
    const thread = await createThreadForUser({
      category,
      userId,
      isAdmin: Boolean(isAdminSession(session)),
      title: parsed.data.title,
      content: parsed.data.content ?? null,
    });

    return json(thread, { status: 201 });
  } catch (routeError) {
    return getRouteErrorResponse(routeError);
  }
}
