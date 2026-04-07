import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { getAdminUserIds } from "@/server/admin";

export class CharacterApplicationHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const CHARACTER_APPLICATION_ADMIN_SELECT = {
  id: true,
  name: true,
  status: true,
  form: true,
  moderatorNote: true,
  moderatorId: true,
  updatedAt: true,
  lastSubmittedAt: true,
  userId: true,
  user: {
    select: {
      id: true,
      email: true,
      username: true,
      profile: { select: { displayName: true, avatarUrl: true } },
    },
  },
} as const;

export async function listCharacterApplicationsForUser(userId: string) {
  return prisma.characterApplication.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      updatedAt: true,
      createdAt: true,
      lastSubmittedAt: true,
      moderatorNote: true,
    },
  });
}

export async function createCharacterApplicationForUser(input: {
  userId: string;
  name: string;
}) {
  const draftsCount = await prisma.characterApplication.count({
    where: { userId: input.userId, status: "DRAFT" },
  });
  if (draftsCount >= 10) {
    throw new CharacterApplicationHttpError(429, "too_many_drafts");
  }

  return prisma.characterApplication.create({
    data: {
      userId: input.userId,
      name: input.name.trim(),
      form: {},
      status: "DRAFT",
    },
    select: { id: true },
  });
}

export async function getCharacterApplicationForUser(input: {
  userId: string;
  id: string;
}) {
  const row = await prisma.characterApplication.findFirst({
    where: { id: input.id, userId: input.userId },
    select: {
      id: true,
      name: true,
      form: true,
      status: true,
      updatedAt: true,
      moderatorNote: true,
    },
  });
  if (!row) {
    throw new CharacterApplicationHttpError(404, "not_found");
  }
  return row;
}

export async function updateCharacterApplicationForUser(input: {
  userId: string;
  id: string;
  name?: string;
  form?: Record<string, unknown>;
}) {
  const current = await prisma.characterApplication.findFirst({
    where: { id: input.id, userId: input.userId },
    select: { id: true, status: true },
  });
  if (!current) {
    throw new CharacterApplicationHttpError(404, "not_found");
  }

  if (current.status !== "DRAFT" && current.status !== "NEEDS_CHANGES") {
    throw new CharacterApplicationHttpError(409, "locked_status");
  }

  const result = await prisma.characterApplication.updateMany({
    where: {
      id: current.id,
      userId: input.userId,
      status: { in: ["DRAFT", "NEEDS_CHANGES"] },
    },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.form !== undefined
        ? { form: input.form as Prisma.InputJsonValue }
        : {}),
    },
  });

  if (result.count === 0) {
    throw new CharacterApplicationHttpError(409, "locked_status");
  }

  return prisma.characterApplication.findFirst({
    where: { id: current.id, userId: input.userId },
    select: { id: true, name: true, status: true, updatedAt: true },
  });
}

export async function submitCharacterApplicationForUser(input: {
  userId: string;
  id: string;
}) {
  const now = new Date();
  const result = await prisma.characterApplication.updateMany({
    where: {
      id: input.id,
      userId: input.userId,
      status: { in: ["DRAFT", "NEEDS_CHANGES"] },
    },
    data: {
      status: "SUBMITTED",
      lastSubmittedAt: now,
      moderatorNote: null,
      moderatorId: null,
    },
  });

  if (result.count === 0) {
    const exists = await prisma.characterApplication.findFirst({
      where: { id: input.id, userId: input.userId },
      select: { id: true, status: true },
    });

    if (!exists) {
      throw new CharacterApplicationHttpError(404, "not_found");
    }

    throw new CharacterApplicationHttpError(409, "bad_status");
  }

  const updated = await prisma.characterApplication.findFirst({
    where: { id: input.id, userId: input.userId },
    select: {
      id: true,
      name: true,
      status: true,
      updatedAt: true,
      lastSubmittedAt: true,
    },
  });

  try {
    const adminIds = await getAdminUserIds();
    if (adminIds.length && updated) {
      await prisma.notification.createMany({
        data: adminIds.map((adminId) => ({
          userId: adminId,
          type: "CHAR_APP_SUBMITTED",
          actorId: input.userId,
          targetType: "CharacterApplication",
          targetId: updated.id,
          payload: { name: updated.name },
          isRead: false,
        })),
        skipDuplicates: true,
      });
    }
  } catch {}

  return updated;
}

export async function listCharacterApplicationsForAdmin() {
  const rows = await prisma.characterApplication.findMany({
    orderBy: [{ lastSubmittedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      status: true,
      updatedAt: true,
      createdAt: true,
      lastSubmittedAt: true,
      moderatorNote: true,
      moderatorId: true,
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      },
    },
  });

  const inReview: typeof rows = [];
  const other: typeof rows = [];

  for (const row of rows) {
    if (row.status === "SUBMITTED" || row.status === "UNDER_REVIEW") inReview.push(row);
    else other.push(row);
  }

  return {
    items: rows,
    groups: {
      inReview,
      other,
    },
  };
}

export async function getCharacterApplicationForAdmin(id: string) {
  const item = await prisma.characterApplication.findUnique({
    where: { id },
    select: CHARACTER_APPLICATION_ADMIN_SELECT,
  });
  if (!item) {
    throw new CharacterApplicationHttpError(404, "not_found");
  }

  if (item.status === "SUBMITTED") {
    const updated = await prisma.characterApplication.updateMany({
      where: { id, status: "SUBMITTED" },
      data: { status: "UNDER_REVIEW" },
    });

    if (updated.count > 0) {
      return prisma.characterApplication.findUnique({
        where: { id },
        select: CHARACTER_APPLICATION_ADMIN_SELECT,
      });
    }
  }

  return item;
}

export async function reviewCharacterApplication(input: {
  id: string;
  moderatorId: string;
  action: "APPROVE" | "NEEDS_CHANGES";
  note?: string;
}) {
  const target = await prisma.characterApplication.findUnique({
    where: { id: input.id },
    select: { id: true, status: true, userId: true, name: true },
  });
  if (!target) {
    throw new CharacterApplicationHttpError(404, "not_found");
  }

  if (!["SUBMITTED", "UNDER_REVIEW", "NEEDS_CHANGES"].includes(target.status)) {
    throw new CharacterApplicationHttpError(409, "bad_status");
  }

  const nextStatus = input.action === "APPROVE" ? "APPROVED" : "NEEDS_CHANGES";
  const note = input.note?.trim() || null;

  const updated = await prisma.characterApplication.update({
    where: { id: input.id },
    data: {
      status: nextStatus,
      moderatorId: input.moderatorId,
      moderatorNote: note,
    },
    select: {
      id: true,
      status: true,
      updatedAt: true,
      moderatorId: true,
      moderatorNote: true,
    },
  });

  try {
    await prisma.notification.create({
      data: {
        userId: target.userId,
        type: nextStatus === "APPROVED" ? "CHAR_APP_APPROVED" : "CHAR_APP_NEEDS_CHANGES",
        actorId: input.moderatorId,
        targetType: "CharacterApplication",
        targetId: target.id,
        payload: { name: target.name, note },
        isRead: false,
      },
    });
  } catch {}

  return updated;
}
