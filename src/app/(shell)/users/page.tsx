// src/app/(shell)/users/page.tsx
import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";
import PlayersTable from "./players-table";
import ShellVariantSetter from "@/app/shell/ShellVariant";

type UserRow = {
  id: string;
  username: string;
  lastSeenAt: Date | null;
  profile: { displayName: string | null } | null;
  characterApplications: { status: string }[];
};

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
  const users: UserRow[] = await prisma.user.findMany({
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
    <>
      {/* Switch shell layout to "full" for this page */}
      <ShellVariantSetter variant="full" />

      <div className="space-y-4">
        <h1 className="header-font-archimoto text-[15px] leading-none uppercase">Users</h1>

        <PlayersTable initialRows={rows} />
      </div>
    </>
  );
}
