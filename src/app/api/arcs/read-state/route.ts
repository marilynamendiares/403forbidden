import type { NextRequest } from "next/server";
import { z } from "zod";
import { getViewerId } from "@/server/authViewer";
import { upsertArcReadState } from "@/server/arcs/readState";
import { isDiscoverySchemaMissingError } from "@/server/arcs/discoveryCompat";
import { error, json } from "@/server/http";

const ReadStateBodySchema = z.object({
  arcId: z.string().cuid(),
  lastChapterId: z.string().cuid().optional().nullable(),
  lastPostId: z.string().cuid().optional().nullable(),
  lastReadPostCreatedAt: z.string().datetime().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const viewerId = await getViewerId();
  if (!viewerId) return error("Unauthorized", 401);

  const parsed = ReadStateBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Bad Request", 400);

  try {
    const result = await upsertArcReadState({
      userId: viewerId,
      arcId: parsed.data.arcId,
      lastChapterId: parsed.data.lastChapterId ?? null,
      lastPostId: parsed.data.lastPostId ?? null,
      lastReadPostCreatedAt: parsed.data.lastReadPostCreatedAt
        ? new Date(parsed.data.lastReadPostCreatedAt)
        : null,
    });

    return json({ ok: true, updatedAt: result.updatedAt.toISOString() });
  } catch (routeError) {
    if (isDiscoverySchemaMissingError(routeError)) {
      return json({ ok: false, skipped: true });
    }
    throw routeError;
  }
}
