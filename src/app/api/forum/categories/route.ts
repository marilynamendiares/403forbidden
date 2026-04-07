import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { CreateCategory } from "@/server/schemas";
import { isAdminSession, requireAdmin } from "@/server/admin";
import { getSessionViewer } from "@/server/session";
import { error, json } from "@/server/http";
import {
  createForumCategory,
  listVisibleForumCategories,
} from "@/server/services/forumCategories";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const tokenUid = token?.sub ?? token?.uid ?? null;

  const { session, userId: sessionUserId } = tokenUid
    ? { session: null, userId: null }
    : await getSessionViewer();

  const admin = isAdminSession(session ?? { email: token?.email ?? null });
  const { categories } = await listVisibleForumCategories({
    userId: tokenUid ?? sessionUserId,
    isAdmin: admin,
  });

  return json(categories);
}

export async function POST(req: Request) {
  const { session } = await getSessionViewer();
  if (!session) return error("Unauthorized", 401);

  try {
    requireAdmin(session);
  } catch {
    return error("Forbidden", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateCategory.safeParse(body);
  if (!parsed.success) return error("Bad Request", 400);

  try {
    const category = await createForumCategory(parsed.data);
    return json(category, { status: 201 });
  } catch {
    return error("Cannot create category", 500);
  }
}
