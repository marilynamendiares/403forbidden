import type { Session } from "next-auth";
import { getSessionUserId as getCanonicalSessionUserId } from "@/server/session";

/**
 * Canonical way to extract userId from NextAuth session.
 * MUST be used everywhere instead of session.user.id / session.userId.
 */
export function getSessionUserId(session: Session | null): string | null {
  return getCanonicalSessionUserId(session);
}
