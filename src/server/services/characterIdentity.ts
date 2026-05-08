import { prisma } from "@/server/db";
import type { CharacterForm } from "@/lib/characterApplication";

export type ApprovedCharacterIdentity = {
  id: string;
  userId: string;
  name: string;
  form: CharacterForm;
  avatarUrl: string | null;
  updatedAt: Date;
};

export function normalizeCharacterForm(input: unknown): CharacterForm {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const record = input as Record<string, unknown>;

  return {
    age: typeof record.age === "number" ? record.age : null,
    gender: typeof record.gender === "string" ? record.gender : "",
    occupation: typeof record.occupation === "string" ? record.occupation : "",
    visualRefUrl: typeof record.visualRefUrl === "string" ? record.visualRefUrl : "",
    appearance: typeof record.appearance === "string" ? record.appearance : "",
    personality: typeof record.personality === "string" ? record.personality : "",
    background: typeof record.background === "string" ? record.background : "",
  };
}

function toIdentity(row: {
  id: string;
  userId: string;
  name: string;
  form: unknown;
  updatedAt: Date;
  user: { profile: { avatarUrl: string | null } | null };
}): ApprovedCharacterIdentity {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    form: normalizeCharacterForm(row.form),
    avatarUrl: row.user.profile?.avatarUrl ?? null,
    updatedAt: row.updatedAt,
  };
}

export async function getApprovedCharacterIdentity(userId: string) {
  const row = await prisma.characterApplication.findFirst({
    where: { userId, status: "APPROVED" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      userId: true,
      name: true,
      form: true,
      updatedAt: true,
      user: { select: { profile: { select: { avatarUrl: true } } } },
    },
  });

  return row ? toIdentity(row) : null;
}

export async function getApprovedCharacterIdentitiesForUsers(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) return new Map<string, ApprovedCharacterIdentity>();

  const rows = await prisma.characterApplication.findMany({
    where: { userId: { in: uniqueUserIds }, status: "APPROVED" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      userId: true,
      name: true,
      form: true,
      updatedAt: true,
      user: { select: { profile: { select: { avatarUrl: true } } } },
    },
  });

  const byUserId = new Map<string, ApprovedCharacterIdentity>();
  for (const row of rows) {
    if (byUserId.has(row.userId)) continue;
    byUserId.set(row.userId, toIdentity(row));
  }

  return byUserId;
}

export async function hasApprovedCharacter(userId: string | null) {
  if (!userId) return false;

  const approved = await prisma.characterApplication.findFirst({
    where: { userId, status: "APPROVED" },
    select: { id: true },
  });

  return Boolean(approved);
}
