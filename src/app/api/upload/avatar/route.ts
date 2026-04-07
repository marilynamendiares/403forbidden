// src/app/api/upload/avatar/route.ts
export const runtime = "nodejs";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/server/db";
import { requireSessionUserId } from "@/server/session";
import { error, json } from "@/server/http";
import { getR2Client, getR2Config, getR2Status } from "@/server/r2";

const MAX_SIZE_BYTES = 500 * 1024; // 500KB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("__ping") !== "1") {
    return error("Not found", 404);
  }

  return json(
    {
      ok: true,
      route: "/api/upload/avatar",
      ...getR2Status(),
    },
    { headers: { "cache-control": "no-store" } }
  );
}

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await requireSessionUserId();
  } catch {
    return error("Unauthorized", 401);
  }

  const { bucket, endpoint, accessKeyId, secretAccessKey, region } = getR2Config();
  const s3 = getR2Client();

  if (!bucket || !s3) {
    return json(
      {
        error: "r2_not_configured",
        hasBucket: Boolean(bucket),
        hasEndpoint: Boolean(endpoint),
        hasKey: Boolean(accessKeyId),
        hasSecret: Boolean(secretAccessKey),
        region,
      },
      { status: 500 }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { contentType?: string; ext?: string }
    | null;

  const contentType = body?.contentType;
  const ext = body?.ext;

  if (!contentType || !ALLOWED_TYPES.has(contentType)) {
    return error("Unsupported content-type", 400);
  }

  const safeExtRaw =
    (ext ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  const safeExt = safeExtRaw === "jpeg" ? "jpg" : safeExtRaw;

  const key = `avatars/${userId}/${Date.now()}.${safeExt}`;

  // ✅ лимит 5 + резервирование key в транзакции (без гонок)
  try {
    await prisma.$transaction(async (tx) => {
      const count = await tx.userAvatar.count({ where: { userId } });
      if (count >= 5) {
        throw new Error("AVATAR_LIMIT_REACHED");
      }

      await tx.userAvatar.create({
        data: { userId, key },
        select: { id: true },
      });
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    const msg = String(message ?? "");
    if (msg === "AVATAR_LIMIT_REACHED") {
      return error("Avatar limit reached (max 5). Delete one first.", 400);
    }
    return json(
      { error: "avatar_reserve_failed", message },
      { status: 500 }
    );
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ContentDisposition: "inline",
    CacheControl: "public, max-age=31536000, immutable",
  });

  try {
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

    return json({
      uploadUrl,
      key,
      maxBytes: MAX_SIZE_BYTES,
      allowed: Array.from(ALLOWED_TYPES),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return json(
      {
        error: "presign_failed",
        message,
      },
      { status: 500 }
    );
  }
}
