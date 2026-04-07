import type { Session } from "next-auth";
import { prisma } from "@/server/db";

type AdminLike = Session | { user?: { email?: string | null } | null; email?: string | null } | null;

export function isAdminSession(session: AdminLike) {
  const email =
    session && "email" in session ? (session.email ?? session.user?.email ?? "") : (session?.user?.email ?? "");
  const normalizedEmail = email.toLowerCase?.() ?? "";
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return Boolean(normalizedEmail) && list.includes(normalizedEmail);
}

export function requireAdmin(session: AdminLike) {
  if (!isAdminSession(session)) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
}


// ✅ NEW: resolve admin users from ADMIN_EMAILS to real userIds
export async function getAdminUserIds() {
  const emails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) return [];

  const rows = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true },
  });

  return rows.map((r) => r.id);
}
