// src/server/services/books.ts
import { prisma } from "@/server/db";
import { slugify } from "@/lib/slug";
import { emit } from "@/server/events";
import { requireRole } from "@/server/access";
import { ensureArcFoundation } from "@/server/arcs/discoveryFoundation";
import {
  refreshDiscoveryContentForArc,
  refreshDiscoveryForArc,
} from "@/server/arcs/discoveryPipeline";
import { sanitizeHtml } from "@/server/render/sanitizeHtml";
import {
  ArcFormat,
  ArcJoinPolicy,
  ArcSearchVisibility,
  ArcStatus,
  ArcVisibility,
} from "@prisma/client";
import { normalizeDiscoveryTags } from "@/lib/arcsMetadata";
import { randomSlugSuffix } from "@/server/random";
import { isUniqueConstraintError } from "@/server/prismaErrors";

export async function listBooks() {
  return prisma.arc.findMany({
    where: {
      allowDiscovery: true,
      searchVisibility: { not: "HIDDEN" },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      publicSlug: true,
      title: true,
      tagline: true,
      hook: true,
      createdAt: true,
      status: true,
      format: true,
      joinPolicy: true,
      visibility: true,
      allowDiscovery: true,
      metrics: {
        select: {
          postsTotal: true,
          followersCount: true,
          lastActivityAt: true,
          heatScore: true,
        },
      },
    },
  });
}

type CreateArcInput = {
  userId: string;
  title: string;
  tagline?: string | null;
};

export async function createArc(input: CreateArcInput) {
  const { userId, title } = input;

  const baseSlug = slugify(title) || "arc";
  let slug = baseSlug;

  // Уникальность в пределах ownerId (см. @@unique([ownerId, slug]))
  for (let i = 0; i < 4; i++) {
    try {
      const created = await prisma.arc.create({
        data: {
          ownerId: userId,
          title,
          slug,
          tagline: input.tagline ?? null,
        },
        select: { id: true, slug: true, title: true },
      });

      await ensureArcFoundation(prisma, {
        arcId: created.id,
        title: created.title,
      });

      // SSE: уведомим список арок
      const createdPayload = {
        id: created.id,
        slug: created.slug,
        title: created.title,
        at: Date.now(),
      };
      emit("arc:created", createdPayload);

      return created;
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      // реальный конфликт уникальности — меняем slug и ретраим
      slug = `${baseSlug}-${randomSlugSuffix(4)}`;
    }
  }

  throw new Error("Cannot create arc");
}

type DeleteArcInput = {
  userId: string;
  slug: string;
};

/**
 * Удаление арки по slug от имени пользователя.
 * Возвращает true, если арка удалена, и false, если не найдена / недоступна пользователю.
 * Бросает ошибку только при реальной технической проблеме.
 */
export async function deleteArcForUser({ userId, slug }: DeleteArcInput): Promise<boolean> {
  // находим арку, к которой у пользователя есть отношение (владелец/коллаборатор)
  const arc = await prisma.arc.findFirst({
    where: {
      slug,
      OR: [
        { ownerId: userId },
        { collaborators: { some: { userId, pageId: null } } },
      ],
    },
    select: { id: true, slug: true },
  });

  if (!arc) return false;

  // Удалять могут OWNER и EDITOR
  await requireRole(userId, arc.id, "EDITOR");

  await prisma.$transaction(async (tx) => {
    await tx.chapter.deleteMany({ where: { arcId: arc.id } });
    await tx.collaborator.deleteMany({ where: { arcId: arc.id } });
    await tx.arcMetrics.deleteMany({ where: { arcId: arc.id } });
    await tx.arcSearchDocument.deleteMany({ where: { arcId: arc.id } });
    await tx.arcReadState.deleteMany({ where: { arcId: arc.id } });
    await tx.arc.delete({ where: { id: arc.id } });
  });

  // SSE: уведомим список арок
  const deletedPayload = {
    id: arc.id,
    slug: arc.slug,
    at: Date.now(),
  };
  emit("arc:deleted", deletedPayload);

  return true;
}

export async function refreshArcDiscovery(arcId: string) {
  return refreshDiscoveryForArc(arcId);
}

type UpdateArcInput = {
  userId: string;
  slug: string;
  intro?: string;
  title?: string;
  tagline?: string | null;
  hook?: string | null;
  summary?: string | null;
  status?: ArcStatus;
  format?: ArcFormat;
  joinPolicy?: ArcJoinPolicy;
  visibility?: ArcVisibility;
  searchVisibility?: ArcSearchVisibility;
  allowDiscovery?: boolean;
  tags?: string[];
};

function toNullableText(value?: string | null) {
  if (value === undefined) return undefined;
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export async function updateArcForUser(input: UpdateArcInput) {
  const arc = await prisma.arc.findFirst({
    where: { slug: input.slug },
    select: { id: true, ownerId: true },
  });
  if (!arc) {
    throw Object.assign(new Error("Not found"), { status: 404 });
  }

  const role = await requireRole(input.userId, arc.id, "EDITOR");
  const isOwner = arc.ownerId === input.userId;
  const canManageArc = isOwner || role === "EDITOR";
  const wantsIntroUpdate = input.intro !== undefined;

  if (!canManageArc) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  if (wantsIntroUpdate && !isOwner) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }

  const normalizedTags = input.tags ? normalizeDiscoveryTags(input.tags) : undefined;
  const safeIntro =
    input.intro !== undefined ? sanitizeHtml(input.intro ?? "") : undefined;

  const updated = await prisma.arc.update({
    where: { id: arc.id },
    data: {
      ...(safeIntro !== undefined ? { introHtml: safeIntro || null } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.tagline !== undefined ? { tagline: toNullableText(input.tagline) } : {}),
      ...(input.hook !== undefined ? { hook: toNullableText(input.hook) } : {}),
      ...(input.summary !== undefined ? { summary: toNullableText(input.summary) } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.format !== undefined ? { format: input.format } : {}),
      ...(input.joinPolicy !== undefined ? { joinPolicy: input.joinPolicy } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      ...(input.searchVisibility !== undefined
        ? { searchVisibility: input.searchVisibility }
        : {}),
      ...(input.allowDiscovery !== undefined
        ? { allowDiscovery: input.allowDiscovery }
        : {}),
      ...(normalizedTags
        ? {
            tags: {
              deleteMany: {},
              create: normalizedTags.map((tag) => ({
                tag: {
                  connectOrCreate: {
                    where: { slug: tag.slug },
                    create: {
                      slug: tag.slug,
                      name: tag.name,
                    },
                  },
                },
              })),
            },
          }
        : {}),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      tagline: true,
      hook: true,
      summary: true,
      introHtml: true,
      status: true,
      format: true,
      joinPolicy: true,
      visibility: true,
      searchVisibility: true,
      allowDiscovery: true,
      updatedAt: true,
    },
  });

  await refreshDiscoveryForArc(arc.id);
  emit("arc:updated", {
    id: updated.id,
    slug: updated.slug,
    title: updated.title,
    at: Date.now(),
  });

  return updated;
}

type AddArcCollaboratorInput = {
  ownerUserId: string;
  slug: string;
  identifier: string;
  role: "EDITOR" | "VIEWER";
};

function normalizeIdentifier(identifier: string) {
  const idf = identifier.trim();
  if (idf.startsWith("@")) return { username: idf.slice(1) };
  if (idf.includes("@")) return { email: idf };
  return { username: idf };
}

export async function addArcCollaboratorForOwner(input: AddArcCollaboratorInput) {
  const arc = await prisma.arc.findFirst({
    where: { slug: input.slug, ownerId: input.ownerUserId },
    select: { id: true, ownerId: true },
  });
  if (!arc) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }

  const idf = normalizeIdentifier(input.identifier);
  const target =
    ("email" in idf
      ? await prisma.user.findUnique({
          where: { email: idf.email! },
          select: { id: true, email: true },
        })
      : null) ??
    (await prisma.user.findUnique({
      where: { username: "username" in idf ? idf.username! : "" },
      select: { id: true, email: true },
    }));

  if (!target) {
    throw Object.assign(new Error("User not found"), { status: 404 });
  }
  if (target.id === arc.ownerId) {
    throw Object.assign(new Error("User is the owner"), { status: 400 });
  }

  const existing = await prisma.collaborator.findFirst({
    where: { userId: target.id, arcId: arc.id, pageId: null },
    select: { id: true },
  });

  const baseSelect = {
    user: {
      select: {
        id: true,
        email: true,
        username: true,
        profile: { select: { displayName: true, avatarUrl: true } },
      },
    },
    role: true,
  } as const;

  const result = existing
    ? await prisma.collaborator.update({
        where: { id: existing.id },
        data: { role: input.role },
        select: baseSelect,
      })
    : await prisma.collaborator.create({
        data: {
          userId: target.id,
          arcId: arc.id,
          pageId: null,
          role: input.role,
        },
        select: baseSelect,
      });

  await refreshDiscoveryContentForArc(arc.id);
  return { ...result, created: !existing };
}

type RemoveArcCollaboratorInput = {
  ownerUserId: string;
  slug: string;
  collaboratorUserId: string;
};

export async function removeArcCollaboratorForOwner(input: RemoveArcCollaboratorInput) {
  const arc = await prisma.arc.findFirst({
    where: { slug: input.slug, ownerId: input.ownerUserId },
    select: { id: true, ownerId: true },
  });
  if (!arc) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  if (input.collaboratorUserId === arc.ownerId) {
    throw Object.assign(new Error("Cannot remove owner"), { status: 400 });
  }

  const existing = await prisma.collaborator.findFirst({
    where: { userId: input.collaboratorUserId, arcId: arc.id, pageId: null },
    select: { id: true },
  });
  if (!existing) {
    throw Object.assign(new Error("Not found"), { status: 404 });
  }

  await prisma.collaborator.delete({ where: { id: existing.id } });
  await refreshDiscoveryContentForArc(arc.id);
}

export async function listArcCollaboratorsForViewer(input: {
  viewerUserId: string;
  slug: string;
}) {
  const arc = await prisma.arc.findFirst({
    where: { slug: input.slug },
    select: { id: true, ownerId: true, title: true, slug: true },
  });
  if (!arc) {
    throw Object.assign(new Error("Not found"), { status: 404 });
  }

  const canSee =
    arc.ownerId === input.viewerUserId ||
    (await prisma.collaborator.findFirst({
      where: { arcId: arc.id, userId: input.viewerUserId, pageId: null },
      select: { id: true },
    }));
  if (!canSee) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }

  const [owner, collaborators] = await Promise.all([
    prisma.user.findUnique({
      where: { id: arc.ownerId },
      select: {
        id: true,
        email: true,
        username: true,
        profile: { select: { displayName: true, avatarUrl: true } },
      },
    }),
    prisma.collaborator.findMany({
      where: { arcId: arc.id, pageId: null },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    arc: {
      id: arc.id,
      slug: arc.slug,
      title: arc.title,
      ownerId: arc.ownerId,
    },
    owner,
    collaborators: collaborators.map((c) => ({
      user: c.user,
      role: c.role,
    })),
  };
}

export async function getArcPageCollaborators(input: {
  viewerUserId: string | null;
  slug: string;
}) {
  if (!input.viewerUserId) return null;

  try {
    return await listArcCollaboratorsForViewer({
      viewerUserId: input.viewerUserId,
      slug: input.slug,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      (error as { status?: number }).status === 403
    ) {
      return null;
    }
    throw error;
  }
}

export async function updateArcCollaboratorRoleForOwner(input: {
  ownerUserId: string;
  slug: string;
  collaboratorUserId: string;
  role: "EDITOR" | "VIEWER";
}) {
  const arc = await prisma.arc.findFirst({
    where: { slug: input.slug, ownerId: input.ownerUserId },
    select: { id: true, ownerId: true },
  });
  if (!arc) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  if (input.collaboratorUserId === arc.ownerId) {
    throw Object.assign(new Error("Cannot change owner"), { status: 400 });
  }

  const existing = await prisma.collaborator.findFirst({
    where: { userId: input.collaboratorUserId, arcId: arc.id, pageId: null },
    select: { id: true },
  });
  if (!existing) {
    throw Object.assign(new Error("Not found"), { status: 404 });
  }

  const updated = await prisma.collaborator.update({
    where: { id: existing.id },
    data: { role: input.role },
    select: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      },
      role: true,
    },
  });

  await refreshDiscoveryContentForArc(arc.id);
  return updated;
}
