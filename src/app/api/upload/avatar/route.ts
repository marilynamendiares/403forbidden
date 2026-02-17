// src/app/api/upload/avatar/route.ts
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/server/db";

const MAX_SIZE_BYTES = 500 * 1024; // 500KB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getR2Client() {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region: process.env.R2_REGION ?? "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("__ping") !== "1") {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.json(
    {
      ok: true,
      route: "/api/upload/avatar",
      hasEndpoint: Boolean(process.env.R2_ENDPOINT),
      hasBucket: Boolean(process.env.R2_BUCKET),
      hasKey: Boolean(process.env.R2_ACCESS_KEY_ID),
      hasSecret: Boolean(process.env.R2_SECRET_ACCESS_KEY),
      region: process.env.R2_REGION ?? "auto",
    },
    { headers: { "cache-control": "no-store" } }
  );
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  const userId =
    ((session as any)?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined);

  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const bucket = process.env.R2_BUCKET;
  const s3 = getR2Client();

  if (!bucket || !s3) {
    return NextResponse.json(
      {
        error: "r2_not_configured",
        hasBucket: Boolean(bucket),
        hasEndpoint: Boolean(process.env.R2_ENDPOINT),
        hasKey: Boolean(process.env.R2_ACCESS_KEY_ID),
        hasSecret: Boolean(process.env.R2_SECRET_ACCESS_KEY),
        region: process.env.R2_REGION ?? "auto",
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
    return new NextResponse("Unsupported content-type", { status: 400 });
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
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    if (msg === "AVATAR_LIMIT_REACHED") {
      return new NextResponse(
        "Avatar limit reached (max 5). Delete one first.",
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "avatar_reserve_failed", message: String(e?.message ?? e) },
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

    return NextResponse.json({
      uploadUrl,
      key,
      maxBytes: MAX_SIZE_BYTES,
      allowed: Array.from(ALLOWED_TYPES),
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "presign_failed",
        message: String(e?.message ?? e),
      },
      { status: 500 }
    );
  }
}
