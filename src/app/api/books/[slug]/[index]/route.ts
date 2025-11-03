// src/app/api/books/[slug]/[index]/route.ts
export const runtime = "nodejs";

import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRole } from "@/server/access";
import { emit } from "@/server/events";

type Ctx = { params: Promise<{ slug: string; index: string }> };

// ─────────────────────────────────────────────────────────────────────────────
// GET: получить главу по индексу
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { slug, index } = await params;

  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 1) {
    return new Response("Bad index", { status: 400 });
  }

  const chapter = await prisma.chapter.findFirst({
    where: { index: idx, book: { slug } },
    select: {
      id: true,
      index: true,
      title: true,
      markdown: true,
      isDraft: true,
      publishedAt: true,
      updatedAt: true,
      status: true, // ← NEW: вернуть статус главы
      authorId: true,
      author: {
        select: {
          id: true,
          email: true,
          profile: { select: { username: true, displayName: true } },
        },
      },
      book: { select: { id: true, slug: true, title: true, ownerId: true } },
    },
  });

  if (!chapter) return new Response("Not found", { status: 404 });

  const session = await getServerSession(authOptions);
  const me = (session as any)?.userId as string | undefined;

  // Если это черновик — видит владелец или коллаборатор книги
  if (chapter.isDraft || !chapter.publishedAt) {
    const isOwner = !!me && me === chapter.book.ownerId;
    const isCollaborator =
      !!me &&
      !!(await prisma.collaborator.findFirst({
        where: { bookId: chapter.book.id, userId: me, pageId: null },
        select: { id: true },
      }));

    if (!isOwner && !isCollaborator) {
      // маскируем как not found
      return new Response("Not found", { status: 404 });
    }
  }

  const canEdit = !!me && (me === chapter.book.ownerId || me === chapter.authorId);

  return Response.json({
    book: { title: chapter.book.title, slug: chapter.book.slug },
    chapter: {
      id: chapter.id,
      index: chapter.index,
      title: chapter.title,
      markdown: chapter.markdown,
      isDraft: chapter.isDraft,
      publishedAt: chapter.publishedAt,
      updatedAt: chapter.updatedAt,
      status: chapter.status, // ← NEW
    },
    author: {
      id: chapter.author?.id ?? null,
      username: chapter.author?.profile?.username ?? null,
      displayName: chapter.author?.profile?.displayName ?? null,
      email: chapter.author?.email ?? null,
    },
    canEdit,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * PATCH: редактирование главы
 *  • OWNER — может всё
 *  • EDITOR — может редактировать только свою (authorId === me) по title/content
 *            и может менять status (OPEN/CLOSED) даже если не author
 *  • publish — только OWNER
 */
// ─────────────────────────────────────────────────────────────────────────────
const UpdateSchema = z.object({
  title: z.string().min(2).max(140).optional(),
  content: z.string().min(1).optional(),
  publish: z.boolean().optional(),
  status: z.enum(["OPEN", "CLOSED"]).optional(), // ← NEW
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { slug, index } = await params;
  const parsed = UpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Bad Request", { status: 400 });
  const data = parsed.data;

  // если ничего менять не попросили — 400
  if (
    data.title === undefined &&
    data.content === undefined &&
    data.publish === undefined &&
    data.status === undefined // ← NEW
  ) {
    return new Response("Nothing to update", { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const me = (session as any)?.userId as string | undefined;
  if (!me) return new Response("Unauthorized", { status: 401 });

  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 1) {
    return new Response("Bad index", { status: 400 });
  }

  // Берём главу вместе с владельцем книги
  const chapter = await prisma.chapter.findFirst({
    where: { book: { slug }, index: idx },
    select: {
      id: true,
      authorId: true,
      bookId: true,
      book: { select: { ownerId: true } },
    },
  });
  if (!chapter) return new Response("Not found", { status: 404 });

  const myRole = (await getRole(me, chapter.bookId)) as
    | "OWNER"
    | "EDITOR"
    | "AUTHOR"
    | "VIEWER"
    | null;

  const isOwner = chapter.book.ownerId === me;
  const isEditorAndAuthor = myRole === "EDITOR" && chapter.authorId === me;

  // запрошенные операции
  const wantsTitle = data.title !== undefined;
  const wantsContent = data.content !== undefined;
  const wantsPublish = data.publish !== undefined;
  const wantsStatus = data.status !== undefined;

  // Проверка прав:
  // OWNER — всегда ок
  if (!isOwner) {
    // publish — только OWNER
    if (wantsPublish) return new Response("Forbidden", { status: 403 });

    // title/content — EDITOR только если он автор этой главы
    if ((wantsTitle || wantsContent) && !isEditorAndAuthor) {
      return new Response("Forbidden", { status: 403 });
    }

    // status — любой EDITOR (даже если не автор); AUTHOR/VIEWER — нельзя
    if (wantsStatus && myRole !== "EDITOR") {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const dataToApply: Record<string, unknown> = {
    ...(wantsTitle ? { title: data.title } : {}),
    ...(wantsContent
      ? {
          markdown: data.content,
          content: { type: "markdown", value: data.content },
        }
      : {}),
    ...(wantsPublish && isOwner
      ? {
          isDraft: !data.publish,
          publishedAt: data.publish ? new Date() : null,
        }
      : {}),
    ...(wantsStatus ? { status: data.status } : {}), // ← NEW
  };

  const updated = await prisma.chapter.update({
    where: { id: chapter.id },
    data: dataToApply,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      publishedAt: true,
      status: true, // ← NEW
    },
  });

  // эмит события после успешного обновления
  await emit("chapter:updated", {
    slug,
    index: idx,
    chapterId: updated.id,
    publishedAt: updated.publishedAt ?? null,
    at: Date.now(),
  });

  // если меняли publish — отдельный ивент
  if (wantsPublish && isOwner) {
    await emit(data.publish ? "chapter:published" : "chapter:unpublished", {
      slug,
      index: idx,
      chapterId: updated.id,
      at: Date.now(),
    });
  }

  // если меняли статус — отдельный ивент
  if (wantsStatus) {
    await emit(`chapter:${data.status === "OPEN" ? "opened" : "closed"}`, {
      slug,
      index: idx,
      chapterId: updated.id,
      at: Date.now(),
    });
  }

  return Response.json(updated);
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * DELETE: удалить главу
 *  • OWNER — может удалить любую
 *  • EDITOR — может удалить только свою (authorId === me)
 */
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { slug, index } = await params;

  const session = await getServerSession(authOptions);
  const me = (session as any)?.userId as string | undefined;
  if (!me) return new Response("Unauthorized", { status: 401 });

  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 1) {
    return new Response("Bad index", { status: 400 });
  }

  const chapter = await prisma.chapter.findFirst({
    where: { book: { slug }, index: idx },
    select: {
      id: true,
      authorId: true,
      bookId: true,
      book: { select: { ownerId: true } },
    },
  });
  if (!chapter) return new Response("Not found", { status: 404 });

  const myRole = (await getRole(me, chapter.bookId)) as
    | "OWNER"
    | "EDITOR"
    | "AUTHOR"
    | "VIEWER"
    | null;
  const isOwner = chapter.book.ownerId === me;
  const canEditorDeleteOwn = myRole === "EDITOR" && chapter.authorId === me;

  if (!isOwner && !canEditorDeleteOwn) {
    return new Response("Forbidden", { status: 403 });
  }

  await prisma.chapter.delete({ where: { id: chapter.id } });

  await emit("chapter:deleted", {
    slug,
    index: idx,
    chapterId: chapter.id,
    at: Date.now(),
  });

  return Response.json({ ok: true });
}
