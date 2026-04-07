// src/app/api/arcs/[slug]/follow/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import {
  getArcBySlug,
  getArcFollowStatus,
  followArc,
  unfollowArc,
} from "@/server/follow";
import { getSessionViewer } from "@/server/session";
import { error, json } from "@/server/http";

type Ctx = { params: Promise<{ slug: string }> };

async function buildCtx(slug: string) {
  const { userId: me } = await getSessionViewer();
  const arc = await getArcBySlug(slug);
  if (!arc) return { me, arc: null as null };
  return { me, arc };
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const { me, arc } = await buildCtx(slug);
  if (!arc) return error("Not found", 404);

  const status = await getArcFollowStatus(me, arc.id);
  return json(status);
}

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const { me, arc } = await buildCtx(slug);
  if (!arc) return error("Not found", 404);
  if (!me) return error("Unauthorized", 401);

  const current = await getArcFollowStatus(me, arc.id);
  const next = current.followed
    ? await unfollowArc(me, arc.id)
    : await followArc(me, arc.id);

  return json(next);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const { me, arc } = await buildCtx(slug);
  if (!arc) return error("Not found", 404);
  if (!me) return error("Unauthorized", 401);

  const status = await unfollowArc(me, arc.id);
  return json(status);
}
