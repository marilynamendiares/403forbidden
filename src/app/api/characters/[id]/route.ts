export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const me = (session as any)?.user?.id ?? (session as any)?.userId;
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const row = await prisma.characterApplication.findFirst({
    where: { id, userId: me },
    select: { id: true, name: true, form: true, status: true, updatedAt: true, moderatorNote: true },
  });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ item: row });
}

const PatchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  form: z.record(z.string(), z.any()).optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const me = (session as any)?.user?.id ?? (session as any)?.userId;
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const cur = await prisma.characterApplication.findFirst({
    where: { id, userId: me },
    select: { id: true, status: true },
  });
  if (!cur) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // редактировать можно только DRAFT / NEEDS_CHANGES
  if (cur.status !== "DRAFT" && cur.status !== "NEEDS_CHANGES") {
    return NextResponse.json({ error: "locked_status" }, { status: 409 });
  }

const res = await prisma.characterApplication.updateMany({
  where: { id: cur.id, userId: me, status: { in: ["DRAFT", "NEEDS_CHANGES"] } },
data: {
  ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
  ...(parsed.data.form !== undefined
    ? { form: parsed.data.form as Prisma.InputJsonValue }
    : {}),
},
});

if (res.count === 0) {
  return NextResponse.json({ error: "locked_status" }, { status: 409 });
}

const updated = await prisma.characterApplication.findFirst({
  where: { id: cur.id, userId: me },
  select: { id: true, name: true, status: true, updatedAt: true },
});

return NextResponse.json({ ok: true, item: updated });
}
