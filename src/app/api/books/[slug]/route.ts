// src/app/api/books/[slug]/route.ts
import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

export const runtime = "nodejs";

// ───────────────── helpers ─────────────────
async function getMe() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
  return userId;
}

async function getBookBySlug(slug: string) {
  const book = await prisma.book.findFirst({
    where: { slug },
    select: { id: true, ownerId: true, title: true, slug: true },
  });

  if (!book) {
    throw Object.assign(new Error("Not found"), { status: 404 });
  }
  return book;
}

// ───────────────── DELETE /api/books/[slug] ─────────────────
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const me = await getMe();
    const { slug } = await ctx.params;
    const book = await getBookBySlug(slug);

    // Только владелец может удалять книгу
    if (book.ownerId !== me) {
      return new Response("Forbidden", { status: 403 });
    }

    // Удаляем все связанное с книгой в одной транзакции
    await prisma.$transaction(async (tx) => {
      // коллабораторы
      await tx.collaborator.deleteMany({
        where: { bookId: book.id },
      });

      // фолловеры книги (если у тебя есть такая модель — поправь имя при необходимости)
      await (tx as any).bookFollow?.deleteMany?.({
        where: { bookId: book.id },
      });

      // главы (если есть CASCADE на дочерние сущности, этого достаточно)
      await tx.chapter.deleteMany({
        where: { bookId: book.id },
      });

      // сама книга
      await tx.book.delete({
        where: { id: book.id },
      });
    });

    return new Response(null, { status: 204 });
  } catch (e: any) {
    const status = e?.status ?? 500;
    const msg = e?.message || "Internal error";
    console.error("Failed to delete book", e);
    return new Response(msg, { status });
  }
}
