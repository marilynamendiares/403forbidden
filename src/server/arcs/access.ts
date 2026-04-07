import type { ArcSearchVisibility, CollabRole } from "@prisma/client";
import { prisma } from "@/server/db";

type ArcAccessResource = {
  id: string;
  ownerId: string;
  searchVisibility: ArcSearchVisibility;
};

export type ArcViewerAccess = {
  role: CollabRole | null;
  isOwner: boolean;
  isCollaborator: boolean;
  canRead: boolean;
  canReadDrafts: boolean;
};

async function getCollaboratorRole(userId: string, arcId: string): Promise<CollabRole | null> {
  const collaborator = await prisma.collaborator.findFirst({
    where: { arcId, userId, pageId: null },
    select: { role: true },
  });
  return collaborator?.role ?? null;
}

export async function getArcViewerAccess(params: {
  viewerId?: string | null;
  arc: ArcAccessResource;
}): Promise<ArcViewerAccess> {
  const { viewerId, arc } = params;

  if (!viewerId) {
    return {
      role: null,
      isOwner: false,
      isCollaborator: false,
      canRead: false,
      canReadDrafts: false,
    };
  }

  const isOwner = viewerId === arc.ownerId;
  if (isOwner) {
    return {
      role: "OWNER",
      isOwner: true,
      isCollaborator: false,
      canRead: true,
      canReadDrafts: true,
    };
  }

  const role = await getCollaboratorRole(viewerId, arc.id);
  const isCollaborator = role !== null;
  if (isCollaborator) {
    return {
      role,
      isOwner: false,
      isCollaborator: true,
      canRead: true,
      canReadDrafts: true,
    };
  }

  const canRead = arc.searchVisibility !== "HIDDEN";

  return {
    role: null,
    isOwner: false,
    isCollaborator: false,
    canRead,
    canReadDrafts: false,
  };
}

export async function canViewerReadArc(params: {
  viewerId?: string | null;
  arc: ArcAccessResource;
}) {
  const access = await getArcViewerAccess(params);
  return access.canRead;
}
