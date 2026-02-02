// src/app/players/page.tsx
import { prisma } from "@/server/db";
import PlayersTable from "./players-table";

export const dynamic = "force-dynamic";

function batteryFromLastSeen(lastSeenAt: Date | null) {
  if (!lastSeenAt) return 0;
  const ms = Date.now() - lastSeenAt.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const pct = Math.max(0, 100 - days);
  return pct;
}

export default async function PlayersPage() {
  // MVP definition of "player": has approved character application
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      lastSeenAt: true,
      profile: { select: { displayName: true } },
      characterApplications: {
        select: { status: true },
      },
    },
    orderBy: { username: "asc" },
  });

  const rows = users
    .map((u) => {
      const isPlayer = u.characterApplications?.some((a) => a.status === "APPROVED");
      return {
        id: u.id,
        username: u.username,
        fullName: u.profile?.displayName ?? "—",
        batteryPct: batteryFromLastSeen(u.lastSeenAt ?? null),
        kind: isPlayer ? ("player" as const) : ("restricted" as const),
      };
    })
    // players first, restricted last
    .sort((a, b) => {
      if (a.kind === b.kind) return a.username.localeCompare(b.username);
      return a.kind === "player" ? -1 : 1;
    });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Players</h1>
          <p className="text-sm opacity-70">
            Directory of connected members.
          </p>
        </div>
      </div>

      <PlayersTable initialRows={rows} />
    </div>
  );
}
