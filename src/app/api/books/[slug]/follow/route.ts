// src/app/api/books/[slug]/follow/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getBookBySlug, getFollowStatus, followBook, unfollowBook } from "@/server/follow";

type Ctx = { params: Promise<{ slug: string }> };

async function buildCtx(_req: NextRequest, slug: string) {
  const session = await getServerSession(authOptions);
  // подстраховка под разные места хранения id
  const me =
    (session?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined) ??
    null;

  const book = await getBookBySlug(slug);
  if (!book) {
    return {
      me,
      book: null as null,
      res: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  return { me, book, res: null as NextResponse | null };
}

// GET /api/books/:slug/follow
export async function GET(req: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const { me, book, res } = await buildCtx(req, slug);
  if (res) return res;

  // getFollowStatus может корректно работать и для неавторизованных (вернёт "not_following"/false)
  const status = await getFollowStatus(me, book!.id);
  return NextResponse.json(status, { status: 200 });
}

// POST /api/books/:slug/follow
export async function POST(req: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const { me, book, res } = await buildCtx(req, slug);
  if (res) return res;

  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = await followBook(me, book!.id);
  return NextResponse.json(status, { status: 201 });
}

// DELETE /api/books/:slug/follow
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const { me, book, res } = await buildCtx(req, slug);
  if (res) return res;

  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = await unfollowBook(me, book!.id);
  return NextResponse.json(status, { status: 200 });
}
