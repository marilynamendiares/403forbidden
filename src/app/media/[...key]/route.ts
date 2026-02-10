// src/app/media/[...key]/route.ts
import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/server/r2";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ key: string[] }> }
) {
  const { key } = await ctx.params;
  const objectKey = key.join("/");

  try {
    const out = await r2.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: objectKey, // ВАЖНО: сюда должны приходить ключи вида "avatars/....jpg"
      })
    );

    if (!out.Body) return new NextResponse("Not found", { status: 404 });

    return new NextResponse(out.Body as any, {
      status: 200,
      headers: {
        "Content-Type": out.ContentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
