// src/app/me/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

export default async function MePage() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) redirect("/auth/signin?next=/me");

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });

  if (!me?.username) redirect("/settings/profile");
  redirect(`/u/${encodeURIComponent(me.username)}`);
}
