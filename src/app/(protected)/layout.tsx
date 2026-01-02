import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { isPlayer } from "@/server/player";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id ?? (session as any)?.userId;

  if (!userId) redirect("/login?next=/forum");

  const ok = await isPlayer(userId);
  if (!ok) {
    // Можно более умно: редиректить на /characters + подсказка
    redirect("/characters?required=1");
  }

  return <>{children}</>;
}
