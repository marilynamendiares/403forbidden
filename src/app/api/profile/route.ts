// src/app/api/profile/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { z } from "zod";

export const runtime = "nodejs";

const PatchSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(64),
  bio: z.string().trim().max(1000).optional(),
});

// простенький генератор username (на случай отсутствия)
function randomUsername(base?: string) {
  const head =
    (base?.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16) || "user");
  const tail = Math.random().toString(36).slice(2, 8);
  return `${head}${tail}`;
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session as any)?.userId as string | undefined;
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response("Bad JSON", { status: 400 });
    }

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(", ");
      return new Response(msg, { status: 400 });
    }

    const displayName = parsed.data.displayName;
    const bio = parsed.data.bio ?? "";

    // убедимся, что у пользователя есть профиль и username
    // (3 попытки, если внезапно поймаем уникальную коллизию по username)
    let lastError: unknown;
    for (let i = 0; i < 3; i++) {
      try {
        const updated = await prisma.profile.upsert({
          where: { userId },
          update: { displayName, bio },
          create: {
            userId,
            username: randomUsername(displayName),
            displayName,
            bio,
          },
          select: {
            username: true,
            displayName: true,
            bio: true,
            avatarUrl: true,
            bannerUrl: true,
            user: { select: { id: true, email: true } },
          },
        });

        return new Response(JSON.stringify(updated), {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      } catch (e) {
        lastError = e;
        // если это конфликт уникальности — попробуем сгенерить другой username и снова
        // у Prisma это обычно код P2002, но чтобы не таскать типы — мягко ретраим
      }
    }

    // если три раза не вышло — сообщаем об ошибке
    console.error("Profile upsert failed", lastError);
    return new Response("Could not save profile", { status: 500 });
  } catch (e) {
    console.error(e);
    return new Response("Internal error", { status: 500 });
  }
}
