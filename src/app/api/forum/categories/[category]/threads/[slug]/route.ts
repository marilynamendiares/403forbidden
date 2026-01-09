import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/admin";

type Ctx = { params: Promise<{ category: string; slug: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { category, slug } = await params;

  const thread = await prisma.forumThread.findFirst({
    where: { slug, category: { slug: category } },
    select: { id: true, authorId: true },
  });

  if (!thread) return NextResponse.json({ error: "thread_not_found" }, { status: 404 });

  return NextResponse.json({ id: thread.id, authorId: thread.authorId });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { category, slug } = await params;

  const session = await getServerSession(authOptions);
  const userId =
    ((session as any)?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined);

  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const thread = await prisma.forumThread.findFirst({
    where: { slug, category: { slug: category } },
    select: { id: true, authorId: true },
  });

  if (!thread) return NextResponse.json({ error: "thread_not_found" }, { status: 404 });

  // права: админ может всё, иначе только автор треда
  let isAdmin = false;
  try {
    requireAdmin(session as any);
    isAdmin = true;
  } catch {}

  if (!isAdmin && thread.authorId !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // безопасно удаляем: сначала посты, потом тред
  await prisma.$transaction([
    prisma.forumPost.deleteMany({ where: { threadId: thread.id } }),
    prisma.forumThread.delete({ where: { id: thread.id } }),
  ]);

  return new NextResponse(null, { status: 204 });
}
