// src/app/avatars/[...key]/route.ts
import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/server/r2"; // адаптируем под твой экспорт

export const runtime = "nodejs"; // важно: aws sdk / stream

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ key: string[] }> }
) {
  const { key } = await ctx.params;
  const objectKey = key.join("/"); // поддержка вложенных путей, если есть

  try {
const r2Key = `avatars/${objectKey}`;

const out = await r2.send(
  new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: r2Key,
  })
);

    if (!out.Body) {
      return new NextResponse("Not found", { status: 404 });
    }

    // ContentType часто приходит корректно из R2; если нет — можно добавить fallback
    const contentType = out.ContentType ?? "application/octet-stream";

    // Body в Node runtime — ReadableStream/Readable
    return new NextResponse(out.Body as any, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // кэш можно настроить по вкусу:
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e: any) {
    // S3NoSuchKey / AccessDenied — маппим аккуратно
    const msg = typeof e?.name === "string" ? e.name : "R2Error";
    const status = msg.includes("NoSuchKey") ? 404 : 404; // наружу лучше одинаково
    return new NextResponse("Not found", { status });
  }
}
