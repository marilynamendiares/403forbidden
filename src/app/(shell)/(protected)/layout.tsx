import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSessionViewer } from "@/server/session";

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
  const { userId } = await getSessionViewer();

  if (!userId) {
    const next = encodeURIComponent(await getNextFromHeaders());
    redirect(`/login?next=${next}`);
  }

  return <>{children}</>;
}
