// src/app/api/uploads/images/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";

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

function toWebStream(body: any): ReadableStream<Uint8Array> {
  if (!body) throw new Error("Empty body");

  if (typeof body.transformToWebStream === "function") {
    return body.transformToWebStream();
  }

  if (body instanceof Readable) {
    // @ts-expect-error Node 18+: Readable.toWeb exists
    return Readable.toWeb(body);
  }

  return body as ReadableStream<Uint8Array>;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("key")?.trim() ?? "";
  const key = raw.replace(/^\/+/, ""); // на всякий случай

  if (!key) {
    return new Response(JSON.stringify({ error: "missing_key" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const bucket = process.env.R2_BUCKET;
  const s3 = getR2Client();

  if (!bucket || !s3) {
    return new Response(JSON.stringify({ error: "r2_not_configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const out = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    const body = toWebStream(out.Body);
    const contentType = out.ContentType ?? "application/octet-stream";

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600",
        ...(out.ETag ? { etag: out.ETag } : {}),
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

    return new Response(
      JSON.stringify({ error: isNotFound ? "not_found" : "fetch_failed" }),
      {
        status: isNotFound ? 404 : 502,
        headers: { "content-type": "application/json" },
      }
    );
  }
}

// POST пока не реализуем
export async function POST(_req: NextRequest) {
  return new Response(JSON.stringify({ error: "Image upload not implemented yet" }), {
    status: 501,
    headers: { "content-type": "application/json" },
  });
}
