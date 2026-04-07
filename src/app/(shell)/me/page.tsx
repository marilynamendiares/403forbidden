// src/app/me/page.tsx
import { redirect } from "next/navigation";
import { getSessionViewer } from "@/server/session";
import { resolveUsernameForUserId } from "@/server/services/usersView";

export const runtime = "nodejs";

export default async function MePage() {
  const { userId } = await getSessionViewer();
  if (!userId) redirect("/auth/signin?next=/me");

  const username = await resolveUsernameForUserId(userId);

  if (!username) redirect("/profile/settings");
  redirect(`/u/${encodeURIComponent(username)}`);
}
