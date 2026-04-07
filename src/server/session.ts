import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { isAdminSession } from "@/server/admin";

export async function getAuthSession() {
  return getServerSession(authOptions);
}

export function getSessionUserId(session: Session | null): string | null {
  if (!session) return null;
  return session.user?.id ?? session.userId ?? null;
}

export async function getSessionViewer() {
  const session = await getAuthSession();
  const userId = getSessionUserId(session);

  return {
    session,
    userId,
    isAuthenticated: Boolean(userId),
    isAdmin: isAdminSession(session),
  };
}

export async function requireSessionUserId() {
  const { userId } = await getSessionViewer();
  if (!userId) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
  return userId;
}
