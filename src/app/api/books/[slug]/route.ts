// src/app/api/books/[slug]/route.ts
import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireRole } from "@/server/access";
import type { NextRequest } from "next/server";

type Ctx = { params: Promise<{ slug: string }> };

// DELETE /api/books/[slug]
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { slug } = await params;

  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // disambiguation по @@unique([ownerId, slug]):
  // находим книгу, к которой у пользователя есть отношение (владелец/коллаборатор)
  const book = await prisma.book.findFirst({
    where: {
      slug,
      OR: [
        { ownerId: userId },
        { collaborators: { some: { userId, pageId: null } } },
      ],
    },
    select: { id: true },
  });
  if (!book) return new Response("Not found", { status: 404 });

  // Удалять могут OWNER и EDITOR
  await requireRole(userId, book.id, "EDITOR");

  await prisma.$transaction(async (tx) => {
    await tx.chapter.deleteMany({ where: { bookId: book.id } });
    await tx.collaborator.deleteMany({ where: { bookId: book.id } });
    await tx.book.delete({ where: { id: book.id } });
  });

  return Response.json({ ok: true });
}
