import { prisma } from "@/server/db";
import { getApprovedCharacterIdentitiesForUsers } from "@/server/services/characterIdentity";

export type UsersDirectoryRow = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  characterName: string | null;
  batteryPct: number;
  lastSeenAt: string | null;
  kind: "player" | "restricted";
};

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function batteryFromLastSeen(lastSeenAt: Date | null) {
  if (!lastSeenAt) return 0;
  const ms = Date.now() - lastSeenAt.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return Math.max(0, 100 - days);
}

export async function listUsersDirectory(): Promise<UsersDirectoryRow[]> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      lastSeenAt: true,
      profile: { select: { displayName: true, avatarUrl: true } },
      characterApplications: { select: { status: true } },
    },
    orderBy: { username: "asc" },
  });

  const characterByUserId = await getApprovedCharacterIdentitiesForUsers(
    users.map((user) => user.id)
  );

  return users
    .map((user) => {
      const approvedCharacter = characterByUserId.get(user.id) ?? null;
      const isPlayer = Boolean(approvedCharacter);

      return {
        id: user.id,
        username: user.username,
        displayName: user.profile?.displayName ?? user.username,
        avatarUrl: user.profile?.avatarUrl ?? null,
        characterName: approvedCharacter?.name ?? null,
        batteryPct: batteryFromLastSeen(user.lastSeenAt),
        lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
        kind: isPlayer ? ("player" as const) : ("restricted" as const),
      };
    })
    .sort((left, right) => {
      const leftOnline =
        left.lastSeenAt !== null &&
        Date.now() - new Date(left.lastSeenAt).getTime() <= ONLINE_WINDOW_MS;
      const rightOnline =
        right.lastSeenAt !== null &&
        Date.now() - new Date(right.lastSeenAt).getTime() <= ONLINE_WINDOW_MS;
      if (leftOnline !== rightOnline) return leftOnline ? -1 : 1;

      if (left.kind === right.kind) {
        return left.username.localeCompare(right.username);
      }
      return left.kind === "player" ? -1 : 1;
    });
}

export async function resolveUsernameForUserId(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });

  return user?.username ?? null;
}
