// src/app/api/arcs/[slug]/chapters/route.ts
import { z } from "zod";
import type { NextRequest } from "next/server";
import {
  listChaptersForViewer,
  createChapterForUser,
} from "@/server/services/chapters";
import { getSessionViewer } from "@/server/session";
import { getRouteErrorResponse, requireApiUserId } from "@/server/api";
import { error, json } from "@/server/http";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const { userId: viewerId } = await getSessionViewer();
  const result = await listChaptersForViewer({ slug, viewerId });
  if (!result) return error("Not found", 404);

  return json({
    arc: { title: result.arc.title },
    chapters: result.chapters,
  });
}

const CreateSchema = z.object({
  title: z.string().trim().min(2).max(140),
  content: z.string().trim().min(1),
  publish: z.boolean().optional(),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return error("Bad Request", 400);

  const userId = await requireApiUserId();
  try {
    const created = await createChapterForUser({
      slug,
      userId,
      title: parsed.data.title,
      content: parsed.data.content,
      publish: parsed.data.publish,
    });

    return json(created, { status: 201 });
  } catch (routeError) {
    console.error("Failed to create chapter", routeError);
    return getRouteErrorResponse(routeError);
  }
}
