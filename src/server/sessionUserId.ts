import type { Session } from "next-auth";

/**
 * Canonical way to extract userId from NextAuth session.
 * MUST be used everywhere instead of session.user.id / session.userId.
 */
export function getSessionUserId(session: Session | null): string | null {
  if (!session) return null;

  const uid =
    ((session as any)?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined) ??
    ((session as any)?.user?.sub as string | undefined);

  return uid ?? null;
}
