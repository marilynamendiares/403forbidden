// src/app/api/uploads/images/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

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

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("key")?.trim() ?? "";
  const key = raw.replace(/^\/+/, "");

  if (!key) {
    return NextResponse.json({ error: "missing_key" }, { status: 400 });
  }

  const bucket = process.env.R2_BUCKET;
  const s3 = getR2Client();

  if (!bucket || !s3) {
    return NextResponse.json({ error: "r2_not_configured" }, { status: 500 });
  }

  try {
    const out = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    if (!out.Body) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const contentType = out.ContentType ?? "application/octet-stream";

    // В nodejs runtime out.Body — stream; NextResponse умеет стримить как any.
    return new NextResponse(out.Body as any, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600",
        ...(out.ETag ? { etag: String(out.ETag) } : {}),
      },
    });
  } catch (e: any) {
    const name = String(e?.name ?? "");
    const code = String(e?.Code ?? e?.code ?? "");

    const isNotFound =
      name.includes("NoSuchKey") ||
      name.includes("NotFound") ||
      code.includes("NoSuchKey") ||
      code.includes("NotFound");

    return NextResponse.json(
      { error: isNotFound ? "not_found" : "fetch_failed" },
      { status: isNotFound ? 404 : 502 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Image upload not implemented yet" },
    { status: 501 }
  );
}
