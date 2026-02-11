// src/app/api/uploads/images/route.ts
import type { NextRequest } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function toWebStream(body: any): Promise<ReadableStream<Uint8Array>> {
  if (!body) throw new Error("Empty body");

  if (typeof body.transformToWebStream === "function") {
    return body.transformToWebStream();
  }

  // Node runtime fallback (без top-level import)
  const { Readable } = await import("node:stream");
  if (body instanceof Readable) {
    // @ts-expect-error Node: Readable.toWeb exists
    return Readable.toWeb(body);
  }

  return body as ReadableStream<Uint8Array>;
}

export async function GET(req: NextRequest) {
  // 1) ДИАГНОСТИКА: доказываем, что Vercel реально исполняет ЭТОТ файл
  if (req.nextUrl.searchParams.get("__ping") === "1") {
    return new Response(
      JSON.stringify({
        ok: true,
        route: "/api/uploads/images",
        hasBucket: !!process.env.R2_BUCKET,
        hasEndpoint: !!process.env.R2_ENDPOINT,
        hasKey: !!process.env.R2_ACCESS_KEY_ID,
        hasSecret: !!process.env.R2_SECRET_ACCESS_KEY,
        region: process.env.R2_REGION ?? "auto",
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
          "x-uploads-images": "ping",
        },
      }
    );
  }

  // 2) ОСНОВНАЯ ЛОГИКА
  const raw = req.nextUrl.searchParams.get("key")?.trim() ?? "";
  const key = raw.replace(/^\/+/, "");

  if (!key) {
    return new Response(JSON.stringify({ error: "missing_key" }), {
      status: 400,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "x-uploads-images": "missing_key",
      },
    });
  }

  const bucket = process.env.R2_BUCKET;
  const s3 = getR2Client();

  if (!bucket || !s3) {
    return new Response(JSON.stringify({ error: "r2_not_configured" }), {
      status: 500,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "x-uploads-images": "r2_not_configured",
      },
    });
  }

  try {
    const out = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    const body = await toWebStream(out.Body);
    const contentType = out.ContentType ?? "application/octet-stream";

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600",
        ...(out.ETag ? { etag: out.ETag } : {}),
        "x-uploads-images": "ok",
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
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
          "x-uploads-images": isNotFound ? "not_found" : "fetch_failed",
        },
      }
    );
  }
}
