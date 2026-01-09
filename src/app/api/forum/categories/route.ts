import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { CreateCategory } from "@/server/schemas";
import { getCategories } from "@/server/repos/forum";
import { isPlayer } from "@/server/player";
import { isAdminSession, requireAdmin } from "@/server/admin";
import { getSessionUserId } from "@/server/sessionUserId";

export async function GET(req: NextRequest) {
  // ✅ Keep your lazy seed behavior, but make it compatible with ACL fields (if present).
  // If your DB already has categories (seed:forum), this does nothing.
  const count = await prisma.forumCategory.count();
  if (count === 0) {
    await prisma.forumCategory.createMany({
      data: [
        {
          slug: "announcements",
          title: "Announcements (Public)",
          desc: "Project news & updates",
          // These fields exist after migration. If migration isn't applied yet,
          // remove them temporarily or run migrate first.
          readVisibility: "PUBLIC" as any,
          createThreadVisibility: "ADMIN" as any,
          createPostVisibility: "ADMIN" as any,
        },
        {
          slug: "lore",
          title: "Lore / World / Map",
          desc: "World-building, canon, meta",
          readVisibility: "PUBLIC" as any,
          createThreadVisibility: "ADMIN" as any,
          createPostVisibility: "ADMIN" as any,
        },
        {
          slug: "offtopic",
          title: "Lounge / Offtopic",
          desc: "Anything else",
          readVisibility: "MEMBERS" as any,
          createThreadVisibility: "PLAYERS" as any,
          createPostVisibility: "MEMBERS" as any,
        },
      ],
      skipDuplicates: true,
    });
  }

  // ✅ In route handlers, prefer JWT token extraction — it's more reliable than getServerSession().
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const tokenUid =
    (token?.sub as string | undefined) ??
    ((token as any)?.uid as string | undefined) ??
    null;

  // Optional fallback (not strictly needed, but keeps compatibility)
  const session = tokenUid ? null : await getServerSession(authOptions);

  const admin = isAdminSession((session as any) ?? (token as any) ?? null);

  let tier: "GUEST" | "RESTRICTED" | "PLAYER" | "ADMIN" = "GUEST";

  if (admin) {
    tier = "ADMIN";
  } else if (tokenUid) {
    const player = await isPlayer(tokenUid);
    tier = player ? "PLAYER" : "RESTRICTED";
  } else if (session) {
    // last resort
    const userId =
      ((session as any)?.user?.id as string | undefined) ??
      ((session as any)?.userId as string | undefined) ??
      null;

    if (!userId) {
      tier = "RESTRICTED";
    } else {
      const player = await isPlayer(userId);
      tier = player ? "PLAYER" : "RESTRICTED";
    }
  }

  const categories = await getCategories();

  // ✅ Filter by readVisibility (DB-driven)
  const visible = categories.filter((c: any) => {
    const rv = c.readVisibility ?? "MEMBERS"; // fallback if older DB
    if (tier === "ADMIN") return true;
    if (rv === "PUBLIC") return true;
    if (rv === "MEMBERS") return tier === "RESTRICTED" || tier === "PLAYER";
    if (rv === "PLAYERS") return tier === "PLAYER";
    return false;
  });

  return Response.json(visible);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  try {
    requireAdmin(session as any);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateCategory.safeParse(body);
  if (!parsed.success) return new Response("Bad Request", { status: 400 });

  // создаём напрямую (репозитория тут не нужно, логика простая)
  const { title, desc } = parsed.data;
  const base = (title || "category")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  let slug = base || "category";

  for (let i = 0; i < 3; i++) {
    try {
      const cat = await prisma.forumCategory.create({ data: { slug, title, desc } });
      return Response.json(cat, { status: 201 });
    } catch {
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }
  }
  return new Response("Cannot create category", { status: 500 });
}
