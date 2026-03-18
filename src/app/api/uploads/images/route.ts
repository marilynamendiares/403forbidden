// src/app/api/uploads/images/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import type { NextRequest } from "next/server";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSessionUserId(session: unknown): string | undefined {
  if (!session || typeof session !== "object") return undefined;
  const candidate = session as {
    user?: { id?: string };
    userId?: string;
  };

  return candidate.user?.id ?? candidate.userId;
}

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

async function toWebStream(body: unknown): Promise<ReadableStream<Uint8Array>> {
  if (!body) throw new Error("Empty body");

  if (typeof body.transformToWebStream === "function") {
    return body.transformToWebStream();
  }

  const { Readable } = await import("node:stream");
  if (body instanceof Readable) {
    // @ts-expect-error Node Readable.toWeb typing does not match runtime body subtype here.
    return Readable.toWeb(body);
  }

  return body as ReadableStream<Uint8Array>;
}

export async function GET(req: NextRequest) {
  // DEBUG PING
  if (req.nextUrl.searchParams.get("__ping") === "1") {
    if (process.env.NODE_ENV === "production") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      });
    }

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
          "x-uploads-images": "ping-v2",
        },
      }
    );
  }

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
        "x-uploads-images": "ok-v2",
      },
    });
  } catch (e: unknown) {
    const err = e as { name?: string; Code?: string; code?: string };
    const name = String(err?.name ?? "");
    const code = String(err?.Code ?? err?.code ?? "");

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
          "x-uploads-images": isNotFound
            ? "not_found-v2"
            : "fetch_failed-v2",
        },
      }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);

  if (!userId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
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
      },
    });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: "missing_file" }), {
      status: 400,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return new Response(
      JSON.stringify({
        error: "unsupported_type",
        allowed: Array.from(ALLOWED_TYPES),
      }),
      {
        status: 400,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return new Response(
      JSON.stringify({
        error: "file_too_large",
        maxBytes: MAX_SIZE_BYTES,
      }),
      {
        status: 400,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      }
    );
  }

  const originalName = (file.name || "image").trim();
  const safeName = originalName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  const extFromMime =
    file.type === "image/jpeg"
      ? "jpg"
      : file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
      ? "webp"
      : file.type === "image/gif"
      ? "gif"
      : file.type === "image/avif"
      ? "avif"
      : "bin";

  const key = `chapter-images/${userId}/${Date.now()}-${crypto.randomUUID()}-${safeName || "image"}.${extFromMime}`;

  try {
    const body = Buffer.from(await file.arrayBuffer());

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: file.type,
        ContentDisposition: "inline",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    return new Response(
      JSON.stringify({
        ok: true,
        key,
        url: `/api/uploads/images?key=${encodeURIComponent(key)}`,
      }),
      {
        status: 201,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      }
    );
  } catch (e: unknown) {
    const err = e as { message?: string };
    return new Response(
      JSON.stringify({
        error: "upload_failed",
        message: String(err?.message ?? e),
      }),
      {
        status: 502,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      }
    );
  }
}

// 👇 ДОБАВЛЯЕМ ЭТО В КОНЕЦ ФАЙЛА

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, HEAD, OPTIONS",
      "x-uploads-images": "options-v2",
      "cache-control": "no-store",
    },
  });
}

export async function HEAD(req: NextRequest) {
  return GET(req);
}
