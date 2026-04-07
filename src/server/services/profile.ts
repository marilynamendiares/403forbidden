import { prisma } from "@/server/db";
import { coerceMediaKey } from "@/lib/media";

export class ProfileHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function listUserAvatarsForUser(userId: string) {
  const items = await prisma.userAvatar.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, key: true, createdAt: true },
  });

  return items.map((item) => ({
    id: item.id,
    key: coerceMediaKey(item.key) ?? item.key,
    createdAt: item.createdAt,
  }));
}

export async function deleteUserAvatarForUser(input: {
  userId: string;
  avatarId: string;
}) {
  const avatar = await prisma.userAvatar.findFirst({
    where: { id: input.avatarId, userId: input.userId },
    select: { id: true, key: true },
  });
  if (!avatar) {
    throw new ProfileHttpError(404, "Not found");
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: input.userId },
    select: { avatarUrl: true },
  });

  const activeKey = coerceMediaKey(profile?.avatarUrl) ?? null;
  const deletedKey = coerceMediaKey(avatar.key) ?? avatar.key;

  await prisma.$transaction([
    prisma.userAvatar.delete({ where: { id: avatar.id } }),
    ...(activeKey === deletedKey
      ? [prisma.profile.update({ where: { userId: input.userId }, data: { avatarUrl: null } })]
      : []),
  ]);
}
