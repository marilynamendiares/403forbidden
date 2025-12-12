// src/app/api/books/[slug]/collaborators/route.ts
import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { z } from "zod";

export const runtime = "nodejs";

// ——— helpers ———
async function getMe() {
  const session = await getServerSession(authOptions);

  const userId =
    (session as any)?.user?.id ??
    (session as any)?.userId ??
    (session as any)?.user?.userId ??
    null;

  if (!userId) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
  return userId as string;
}

async function getBookBySlug(slug: string) {
  const book = await prisma.book.findFirst({
    where: { slug },
    select: { id: true, ownerId: true, title: true, slug: true },
  });
  if (!book) throw Object.assign(new Error("Not found"), { status: 404 });
  return book;
}

async function ensureOwner(userId: string, bookId: string) {
  const owner = await prisma.book.findFirst({
    where: { id: bookId, ownerId: userId },
    select: { id: true },
  });
  if (!owner) throw Object.assign(new Error("Forbidden"), { status: 403 });
}

// @username или просто слово → считаем «юзернеймом»;
// всё остальное с @ внутри → email
function normalizeIdentifier(identifier: string) {
  const idf = identifier.trim();
  if (idf.startsWith("@")) return { username: idf.slice(1) };
  if (idf.includes("@")) return { email: idf };
  return { username: idf };
}

// ——— GET: список ———
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const userId = await getMe();
    const { slug } = await ctx.params;
    const book = await getBookBySlug(slug);

    const canSee =
      book.ownerId === userId ||
      (await prisma.collaborator.findFirst({
        where: { bookId: book.id, userId, pageId: null },
        select: { id: true },
      }));
    if (!canSee) return new Response("Forbidden", { status: 403 });

    const owner = await prisma.user.findUnique({
      where: { id: book.ownerId },
      select: {
        id: true,
        email: true,
        username: true, // ← ДОБАВИЛИ
        profile: {
          select: { displayName: true, avatarUrl: true },
        },
      },
    });

    const collaborators = await prisma.collaborator.findMany({
      where: { bookId: book.id, pageId: null },
      select: {
        id: true,
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            username: true, // ← ДОБАВИЛИ
            profile: {
              select: { displayName: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return Response.json({
      book: {
        id: book.id,
        slug: book.slug,
        title: book.title,
        ownerId: book.ownerId,
      },
      owner,
      collaborators: collaborators.map((c) => ({
        user: c.user,
        role: c.role,
      })),
    });
  } catch (e: any) {
    const status = e?.status ?? 500;
    return new Response(e?.message || "Internal error", { status });
  }
}

// ——— POST: добавить/обновить коллаборатора ———
const AddSchema = z.object({
  identifier: z.string().trim().min(1),
  role: z.enum(["EDITOR", "VIEWER"]).default("EDITOR"),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const me = await getMe();
    const { slug } = await ctx.params;

    const body = await req.json().catch(() => null);
    const parsed = AddSchema.safeParse(body);
    if (!parsed.success) return new Response("Bad Request", { status: 400 });

    const book = await getBookBySlug(slug);
    await ensureOwner(me, book.id);

    const idf = normalizeIdentifier(parsed.data.identifier);

    // 1) сначала ищем по email
    // 2) если нет — ищем по username (поле User.username)
    const target =
      ("email" in idf
        ? await prisma.user.findUnique({
            where: { email: idf.email! },
            select: { id: true, email: true },
          })
        : null) ??
      (await prisma.user.findUnique({
        where: {
          username: "username" in idf ? idf.username! : "",
        },
        select: { id: true, email: true },
      }));

    if (!target) return new Response("User not found", { status: 404 });
    if (target.id === book.ownerId)
      return new Response("User is the owner", { status: 400 });

    const existing = await prisma.collaborator.findFirst({
      where: { userId: target.id, bookId: book.id, pageId: null },
      select: { id: true },
    });

    const baseSelect = {
      user: {
        select: {
          id: true,
          email: true,
          username: true, // ← ДОБАВИЛИ
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      },
      role: true,
    } as const;

    const result = existing
      ? await prisma.collaborator.update({
          where: { id: existing.id },
          data: { role: parsed.data.role },
          select: baseSelect,
        })
      : await prisma.collaborator.create({
          data: {
            userId: target.id,
            bookId: book.id,
            pageId: null,
            role: parsed.data.role,
          },
          select: baseSelect,
        });

    return Response.json(result, { status: existing ? 200 : 201 });
  } catch (e: any) {
    const status = e?.status ?? 500;
    return new Response(e?.message || "Internal error", { status });
  }
}

// ——— PATCH: сменить роль ———
const PatchSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(["EDITOR", "VIEWER"]),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const me = await getMe();
    const { slug } = await ctx.params;

    const book = await getBookBySlug(slug);
    await ensureOwner(me, book.id);

    const body = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return new Response("Bad Request", { status: 400 });
    if (parsed.data.userId === book.ownerId)
      return new Response("Cannot change owner", { status: 400 });

    const existing = await prisma.collaborator.findFirst({
      where: { userId: parsed.data.userId, bookId: book.id, pageId: null },
      select: { id: true },
    });
    if (!existing) return new Response("Not found", { status: 404 });

    const updated = await prisma.collaborator.update({
      where: { id: existing.id },
      data: { role: parsed.data.role },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            username: true, // ← ДОБАВИЛИ
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
        role: true,
      },
    });

    return Response.json(updated);
  } catch (e: any) {
    const status = e?.status ?? 500;
    return new Response(e?.message || "Internal error", { status });
  }
}

// ——— DELETE: удалить коллаборатора ———
const DeleteSchema = z.object({
  userId: z.string().cuid(),
});

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const me = await getMe();
    const { slug } = await ctx.params;

    const book = await getBookBySlug(slug);
    await ensureOwner(me, book.id);

    const body = await req.json().catch(() => null);
    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) return new Response("Bad Request", { status: 400 });
    if (parsed.data.userId === book.ownerId)
      return new Response("Cannot remove owner", { status: 400 });

    const existing = await prisma.collaborator.findFirst({
      where: { userId: parsed.data.userId, bookId: book.id, pageId: null },
      select: { id: true },
    });
    if (!existing) return new Response("Not found", { status: 404 });

    await prisma.collaborator.delete({ where: { id: existing.id } });
    return new Response(null, { status: 204 });
  } catch (e: any) {
    const status = e?.status ?? 500;
    return new Response(e?.message || "Internal error", { status });
  }
}
