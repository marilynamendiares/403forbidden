import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { isPlayer } from "@/server/player";
import { headers } from "next/headers";

async function getNextFromHeaders() {
  const h = await headers();

  const nextUrl = h.get("next-url");
  if (nextUrl && nextUrl.startsWith("/")) return nextUrl;

  const ref = h.get("referer");
  if (ref) {
    try {
      const u = new URL(ref);
      return u.pathname + u.search;
    } catch {
      // ignore
    }
  }

  return "/forum";
}

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id ?? (session as any)?.userId;

  if (!userId) {
    const next = encodeURIComponent(await getNextFromHeaders());
    redirect(`/login?next=${next}`);
  }

  const ok = await isPlayer(userId);
  if (!ok) {
    redirect("/characters?required=1");
  }

  return <>{children}</>;
}
