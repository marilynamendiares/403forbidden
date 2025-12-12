// src/app/api/upload/avatar/route.ts
export const runtime = "nodejs";

import { r2 } from "@/server/r2";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const MAX_SIZE_BYTES = 1_200_000;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function withBucket(base: string, bucket: string) {
  const t = base.replace(/\/+$/, "");
  if (t.endsWith(`/${bucket}`)) return t;
  return `${t}/${bucket}`;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { contentType, ext } = (await req.json().catch(() => ({}))) as {
    contentType?: string;
    ext?: string;
  };

  if (!contentType || !ALLOWED_TYPES.has(contentType)) {
    return new NextResponse("Unsupported content-type", { status: 400 });
  }

  const safeExt = (ext ?? "").replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  const key = `avatars/${userId}/${Date.now()}.${safeExt}`;

// PUT на S3 endpoint — как было
const command = new PutObjectCommand({
  Bucket: process.env.R2_BUCKET!,
  Key: key,
  ContentType: contentType,
  ContentDisposition: "inline",
  CacheControl: "public, max-age=31536000, immutable",
});
const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 60 });

// Публичная ссылка: если задан R2_PUBLIC_BASE — ДОВЕРЯЕМ ЕМУ и НИЧЕГО не дописываем
const base = (process.env.R2_PUBLIC_BASE || `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}`)
  .replace(/\/+$/, ""); // обрезаем хвостовые слэши

const publicUrl = `${base}/${key}`;

  return NextResponse.json({
    uploadUrl,
    publicUrl,
    maxBytes: MAX_SIZE_BYTES,
    allowed: Array.from(ALLOWED_TYPES),
  });
}
