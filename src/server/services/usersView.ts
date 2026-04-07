import { prisma } from "@/server/db";

type UsersDirectoryRow = {
  id: string;
  username: string;
  fullName: string;
  batteryPct: number;
  kind: "player" | "restricted";
};

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
      profile: { select: { displayName: true } },
      characterApplications: { select: { status: true } },
    },
    orderBy: { username: "asc" },
  });

  return users
    .map((user) => {
      const isPlayer = user.characterApplications.some(
        (application) => application.status === "APPROVED"
      );

      return {
        id: user.id,
        username: user.username,
        fullName: user.profile?.displayName ?? "—",
        batteryPct: batteryFromLastSeen(user.lastSeenAt),
        kind: isPlayer ? ("player" as const) : ("restricted" as const),
      };
    })
    .sort((left, right) => {
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
