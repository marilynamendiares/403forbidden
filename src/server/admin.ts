import type { Session } from "next-auth";
import { prisma } from "@/server/db";

export function isAdminSession(session: Session | null) {
  const email = session?.user?.email?.toLowerCase?.() ?? "";
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return email && list.includes(email);
}

export function requireAdmin(session: Session | null) {
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