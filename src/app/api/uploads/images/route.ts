// src/app/api/uploads/images/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";

/**
 * 🪝 Скелет под R2-upload.
 *
 * План на будущее:
 *  - принимать FormData c файлом (field "file")
 *  - загружать в R2 (через S3-совместимый SDK или presigned URL)
 *  - возвращать { url: "https://cdn.example/..." }
 *
 * Сейчас:
 *  - просто 501 Not Implemented, чтобы не ломать ничего.
 */
export async function POST(req: NextRequest) {
  /**
   * 🔮 FUTURE: здесь будет реальная загрузка в R2.
   *
   * Пример скелета (псевдокод):
   *
   * const form = await req.formData();
   * const file = form.get("file") as File | null;
   * if (!file || typeof file === "string") {
   *   return new Response("No file", { status: 400 });
   * }
   *
   * // 1) Прочитать содержимое файла как ArrayBuffer/Uint8Array
   * //    const bytes = await file.arrayBuffer();
   *
   * // 2) Загрузить в R2 (пример через S3-совместимый клиент):
   * //    await r2Client.putObject({
   * //      Bucket: process.env.R2_BUCKET!,
   * //      Key: someGeneratedKey,
   * //      Body: Buffer.from(bytes),
   * //      ContentType: file.type || "application/octet-stream",
   * //      ACL: "public-read", // или через отдельный публичный endpoint
   * //    });
   *
   * // 3) Сформировать публичный URL:
   * //    const url = `https://your-r2-domain/${someGeneratedKey}`;
   *
   * // 4) Вернуть его клиенту:
   * //    return Response.json({ url });
   */

  return new Response(
    JSON.stringify({
      error: "Image upload not implemented yet",
    }),
    {
      status: 501,
      headers: { "content-type": "application/json" },
    }
  );
}
