// src/app/api/uploads/images/route.ts
import type { NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { r2 } from "@/server/r2";

export const runtime = "nodejs";

function toWebStream(body: any): ReadableStream<Uint8Array> {
  if (!body) throw new Error("Empty body");
  if (typeof body.transformToWebStream === "function") return body.transformToWebStream();
  if (body instanceof Readable) {
    // @ts-expect-error Node 18+: Readable.toWeb exists
    return Readable.toWeb(body);
  }
  return body as ReadableStream<Uint8Array>;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("key")?.trim() ?? "";
  const key = raw.replace(/^\/+/, "");

  if (!key) {
    return new Response(JSON.stringify({ error: "missing_key" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const bucket = process.env.R2_BUCKET;
  if (!bucket) {
    return new Response(JSON.stringify({ error: "r2_not_configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const out = await r2.send(
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

export async function POST() {
  return new Response(JSON.stringify({ error: "method_not_allowed" }), {
    status: 405,
    headers: { "content-type": "application/json" },
  });
}
