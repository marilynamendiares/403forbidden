import { prisma } from "@/server/db";
import { coerceMediaKey } from "@/lib/media";
import { randomSlugSuffix } from "@/server/random";

export class ProfileViewHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function randomUsername(base?: string) {
  const head =
    base?.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16) || "user";
  const tail = randomSlugSuffix(6);
  return `${head}${tail}`;
}

export async function getMyProfile(userId: string) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      profile: {
        select: {
          displayName: true,
          bio: true,
          avatarUrl: true,
          bannerUrl: true,
        },
      },
      wallet: {
        select: {
          eurodollars: true,
        },
      },
    },
  });
  if (!me) {
    throw new ProfileViewHttpError(404, "Not found");
  }

  return {
    username: me.username,
    displayName: me.profile?.displayName ?? me.username,
    bio: me.profile?.bio ?? null,
    avatarUrl: coerceMediaKey(me.profile?.avatarUrl) ?? null,
    bannerUrl: coerceMediaKey(me.profile?.bannerUrl) ?? null,
    eurodollars: me.wallet?.eurodollars ?? 0,
    user: { id: me.id, email: me.email },
  };
}

export async function updateMyProfile(input: {
  userId: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
}) {
  const avatarKey =
    input.avatarUrl !== undefined ? (coerceMediaKey(input.avatarUrl) ?? null) : undefined;
  const bannerKey =
    input.bannerUrl !== undefined ? (coerceMediaKey(input.bannerUrl) ?? null) : undefined;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const me = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, username: true, email: true },
      });
      if (!me) {
        throw new ProfileViewHttpError(404, "User not found");
      }

      const ensuredUsername =
        me.username && me.username.length >= 3
          ? me.username
          : (
              await prisma.user.update({
                where: { id: input.userId },
                data: { username: randomUsername(input.displayName) },
                select: { username: true },
              })
            ).username;

      const updatedProfile = await prisma.profile.upsert({
        where: { userId: input.userId },
        update: {
          displayName: input.displayName,
          bio: typeof input.bio === "string" ? input.bio : undefined,
          ...(avatarKey !== undefined ? { avatarUrl: avatarKey } : {}),
          ...(bannerKey !== undefined ? { bannerUrl: bannerKey } : {}),
        },
        create: {
          userId: input.userId,
          displayName: input.displayName,
          bio: typeof input.bio === "string" ? input.bio : "",
          avatarUrl: avatarKey ?? null,
          bannerUrl: bannerKey ?? null,
        },
        select: {
          displayName: true,
          bio: true,
          avatarUrl: true,
          bannerUrl: true,
        },
      });

      return {
        username: ensuredUsername,
        displayName: updatedProfile.displayName,
        bio: updatedProfile.bio,
        avatarUrl: coerceMediaKey(updatedProfile.avatarUrl) ?? null,
        bannerUrl: coerceMediaKey(updatedProfile.bannerUrl) ?? null,
        user: { id: input.userId, email: me.email },
      };
    } catch (error) {
      if (error instanceof ProfileViewHttpError) {
        throw error;
      }

      if (attempt === 2) {
        throw new ProfileViewHttpError(500, "Could not save profile");
      }
    }
  }

  throw new ProfileViewHttpError(500, "Could not save profile");
}

export async function getPublicProfileByUsername(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      profile: {
        select: {
          displayName: true,
          bio: true,
          avatarUrl: true,
          bannerUrl: true,
        },
      },
    },
  });

  if (!user) {
    throw new ProfileViewHttpError(404, "Profile not found");
  }

  return {
    username: user.username,
    displayName: user.profile?.displayName ?? user.username,
    bio: user.profile?.bio ?? null,
    avatarUrl: coerceMediaKey(user.profile?.avatarUrl) ?? null,
    bannerUrl: coerceMediaKey(user.profile?.bannerUrl) ?? null,
    user: { id: user.id },
  };
}
