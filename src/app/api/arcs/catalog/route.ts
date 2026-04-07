import type { NextRequest } from "next/server";
import { ArcFormat, ArcStatus, ArcVisibility } from "@prisma/client";
import { z } from "zod";
import { getArcsCatalog } from "@/server/repos/arcs";
import { getViewerId } from "@/server/authViewer";
import { error, json } from "@/server/http";

const QuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  q: z.string().trim().min(1).optional(),
  status: z.nativeEnum(ArcStatus).optional(),
  format: z.nativeEnum(ArcFormat).optional(),
  visibility: z.nativeEnum(ArcVisibility).optional(),
  activity: z.enum(["dead", "warm", "hot"]).optional(),
  tag: z.string().trim().min(1).optional(),
  sort: z.enum(["recent", "trending", "new"]).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) return error("Bad Request", 400);

  const viewerId = await getViewerId();

  const result = await getArcsCatalog({
    ...parsed.data,
    viewerId,
  });

  return json(result);
}
