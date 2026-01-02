export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { z } from "zod";

export async function GET() {
  const session = await getServerSession(authOptions);
  const me = (session as any)?.user?.id ?? (session as any)?.userId;
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const items = await prisma.characterApplication.findMany({
    where: { userId: me },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      updatedAt: true,
      createdAt: true,
      lastSubmittedAt: true,
      moderatorNote: true, // ✅ нужно для NEEDS_CHANGES preview
    },
  });

  return NextResponse.json({ items });
}

const CreateSchema = z.object({
  name: z.string().min(2).max(80),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const me = (session as any)?.user?.id ?? (session as any)?.userId;
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const name = parsed.data.name.trim();
  if (name.length < 2) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const draftsCount = await prisma.characterApplication.count({
    where: { userId: me, status: "DRAFT" },
  });
  if (draftsCount >= 10) return NextResponse.json({ error: "too_many_drafts" }, { status: 429 });

  const row = await prisma.characterApplication.create({
    data: {
      userId: me,
      name,
      form: {},
      status: "DRAFT",
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: row.id });
}
