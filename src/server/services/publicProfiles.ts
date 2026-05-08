import { prisma } from "@/server/db";
import { coerceMediaKey } from "@/lib/media";
import { getApprovedCharacterIdentity } from "@/server/services/characterIdentity";
import { getProfileArcChronology } from "@/server/services/profileArcChronology";

export class PublicProfileHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function getPublicProfileSeoByUsername(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      username: true,
      profile: { select: { displayName: true, bio: true } },
    },
  });

  if (!user) return null;

  return {
    username: user.username,
    displayName: user.profile?.displayName ?? user.username,
    bio: user.profile?.bio ?? null,
  };
}

export async function getPublicProfilePageByUsername(username: string) {
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
    throw new PublicProfileHttpError(404, "Profile not found");
  }

  const [wallet, likesReceived, chronology] = await Promise.all([
    prisma.wallet.findUnique({
      where: { userId: user.id },
      select: { eurodollars: true, reputationTotal: true },
    }),
    prisma.chapterPostLike.count({
      where: { post: { authorId: user.id } },
    }),
    getProfileArcChronology({ userId: user.id, publicOnly: true }),
  ]);

  const approvedCharacter = await getApprovedCharacterIdentity(user.id);

  return {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.profile?.displayName ?? user.username,
      bio: user.profile?.bio ?? "",
      avatarUrl: coerceMediaKey(user.profile?.avatarUrl) ?? null,
      bannerUrl: coerceMediaKey(user.profile?.bannerUrl) ?? null,
    },
    stats: {
      eurodollars: wallet?.eurodollars ?? 0,
      reputation: wallet?.reputationTotal ?? 0,
      likesReceived,
    },
    approvedCharacter,
    chronology,
  };
}

export async function getPublicInventoryPageByUsername(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      profile: { select: { displayName: true } },
    },
  });

  if (!user) {
    throw new PublicProfileHttpError(404, "Inventory not found");
  }

  const inventory = await prisma.inventoryItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      item: {
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          category: true,
          priceEurodollars: true,
          requiredReputation: true,
        },
      },
    },
  });

  const grouped = new Map<string, typeof inventory>();
  for (const row of inventory) {
    const category = row.item.category || "OTHER";
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category)!.push(row);
  }

  return {
    user: {
      username: user.username,
      displayName: user.profile?.displayName ?? user.username,
    },
    inventory,
    grouped: [...grouped.entries()],
  };
}
