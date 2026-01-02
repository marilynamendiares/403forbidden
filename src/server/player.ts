import { prisma } from "@/server/db";

export async function isPlayer(userId: string) {
  const approved = await prisma.characterApplication.findFirst({
    where: { userId, status: "APPROVED" },
    select: { id: true },
  });
  return !!approved;
}

export async function requirePlayer(userId: string) {
  const ok = await isPlayer(userId);
  if (!ok) {
    throw Object.assign(new Error("PLAYER_REQUIRED"), {
      status: 403,
      code: "PLAYER_REQUIRED",
    });
  }
}

export async function getApprovedCharacter(userId: string) {
  return prisma.characterApplication.findFirst({
    where: { userId, status: "APPROVED" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, form: true, updatedAt: true },
  });
}
