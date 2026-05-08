"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BatteryCharging, Battery, HardDrive, PlugZap, Plug, Waypoints } from "lucide-react";
import AvatarImg from "@/components/avatarImg";
import { usePresence } from "@/hooks/usePresence";
import type { UsersDirectoryRow } from "@/server/services/usersView";

type SortMode = "presence" | "username" | "players" | "recent";

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function isRecent(lastSeenAt: string | null) {
  if (!lastSeenAt) return false;
  const time = new Date(lastSeenAt).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= ONLINE_WINDOW_MS;
}

function lastSeenTime(lastSeenAt: string | null) {
  if (!lastSeenAt) return 0;
  const time = new Date(lastSeenAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatLastSeen(lastSeenAt: string | null, connected: boolean) {
  if (connected) return "connected now";
  if (!lastSeenAt) return "last seen unknown";

  const time = lastSeenTime(lastSeenAt);
  if (!time) return "last seen unknown";

  const minutes = Math.max(1, Math.round((Date.now() - time) / 60000));
  if (minutes < 60) return `last seen ${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 48) return `last seen ${hours}h ago`;

  const days = Math.round(hours / 24);
  return `last seen ${days}d ago`;
}

function compareUsername(left: UsersDirectoryRow, right: UsersDirectoryRow) {
  return left.username.localeCompare(right.username);
}

export default function UsersTable({ initialRows }: { initialRows: UsersDirectoryRow[] }) {
  const { onlineIds } = usePresence();
  const [sortMode, setSortMode] = useState<SortMode>("presence");
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const withPresence = initialRows
      .filter((r) => {
        if (!normalizedQuery) return true;
        const haystack = [
          r.username,
          r.displayName,
          r.characterName ?? "",
        ].join(" ").toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .map((r) => {
        const connected = onlineIds.has(r.id);
        return { ...r, connected: connected || isRecent(r.lastSeenAt) };
      });

    return [...withPresence].sort((left, right) => {
      if (sortMode === "username") return compareUsername(left, right);

      if (sortMode === "players") {
        if (left.kind !== right.kind) return left.kind === "player" ? -1 : 1;
        if (left.connected !== right.connected) return left.connected ? -1 : 1;
        return compareUsername(left, right);
      }

      if (sortMode === "recent") {
        const recentDelta = lastSeenTime(right.lastSeenAt) - lastSeenTime(left.lastSeenAt);
        if (recentDelta !== 0) return recentDelta;
        return compareUsername(left, right);
      }

      if (left.connected !== right.connected) return left.connected ? -1 : 1;
      if (left.kind !== right.kind) return left.kind === "player" ? -1 : 1;
      return compareUsername(left, right);
    });
  }, [initialRows, onlineIds, query, sortMode]);

  const sortOptions: Array<{ value: SortMode; label: string }> = [
    { value: "presence", label: "presence" },
    { value: "players", label: "players" },
    { value: "recent", label: "recent" },
    { value: "username", label: "username" },
  ];

  function toggleRow(id: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // 👇 ключевой момент: "Full name" больше НЕ 420px
  // Подгони 280px/300px/320px по вкусу.
  const GRID =
  // compact first (small screens): hide full name column and shrink status/battery
  "grid-cols-[44px_1fr_140px_110px_24px] " +
  // wide on md+: show full name column + comfortable battery
  "md:grid-cols-[44px_260px_1fr_150px_140px_24px]";


return (
  <div className="w-full">
    <div className="mx-auto mb-3 flex w-full max-w-350 flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        <div className="text-xs font-mono uppercase tracking-[0.18em] text-white/45">
          directory
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="search users / characters"
          className="min-w-[220px] flex-1 rounded-md border border-white/10 bg-white/3 px-3 py-2 text-xs text-white/80 placeholder:text-white/30 focus:border-white/25 focus:outline-none"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {sortOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSortMode(option.value)}
            className={[
              "rounded-md border px-3 py-1.5 text-xs uppercase tracking-[0.14em]",
              sortMode === option.value
                ? "border-white/25 bg-white/10 text-white"
                : "border-white/10 bg-white/3 text-white/55 hover:bg-white/6",
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>

    {/* keep table readable on ultrawide */}
    <div className="mx-auto w-full max-w-350 rounded-2xl border border-white/10 bg-white/3">

<div
  className={`grid w-full ${GRID} gap-2 px-4 py-3 text-xs font-mono uppercase tracking-[0.22em] opacity-60`}
>
  <div></div>
  <div>User</div>

  {/* full name only on md+ */}
  <div className="hidden md:block">Identity</div>

  <div>Status</div>
  <div className="text-right">Battery</div>
  <div></div>
</div>


      <div className="divide-y divide-white/5">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-white/45">
            no users found
          </div>
        ) : null}

        {rows.map((r) => {
          const open = openIds.has(r.id);

          return (
            <div key={r.id}>
              <div
                className={`grid w-full cursor-pointer ${GRID} items-center gap-2 px-4 py-3 text-sm hover:bg-white/4 ${
                  r.kind === "restricted" ? "text-white/70" : ""
                }`}
                onClick={() => toggleRow(r.id)}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="w-3 text-center font-mono text-xs opacity-55">
                    {open ? "-" : "+"}
                  </span>
                  {r.kind === "restricted" ? (
                    <span className="text-xs font-mono opacity-40">--</span>
                  ) : (
                    <HardDrive className="h-4 w-4 opacity-70" />
                  )}
                </div>

            <Link
              href={`/u/${encodeURIComponent(r.username)}`}
              className="flex min-w-0 items-center gap-3 hover:text-white"
              onClick={(event) => event.stopPropagation()}
            >
              <span className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-white/5">
                <AvatarImg
                  src={r.avatarUrl ?? undefined}
                  alt={`${r.displayName} avatar`}
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate opacity-90">@{r.username}</span>
                <span className="block truncate text-xs opacity-45 md:hidden">
                  {r.displayName}
                </span>
              </span>
            </Link>

            <div className="hidden min-w-0 md:block">
              <div className="truncate opacity-80">{r.displayName}</div>
              <div className="truncate text-xs opacity-45">
                {r.characterName ? r.characterName : "no approved character"}
              </div>
            </div>

            <div>
{r.kind === "restricted" ? (
<span className="inline-flex w-40 items-center justify-start gap-2 rounded-md
  border border-white/10
  bg-white/5
  text-white/70
  px-3 py-1 text-xs"
>
  <Waypoints className="h-3.5 w-3.5 opacity-70" />
  GUEST TUNNEL
</span>
              ) : r.connected ? (
<span className="inline-flex w-40 items-center justify-start gap-2 rounded-md
  border border-blue-400/30
  bg-blue-400/10
  text-blue-200
  px-3 py-1 text-xs"
>
  <PlugZap className="h-3.5 w-3.5 opacity-80" />
  CONNECTED
</span>

              ) : (
<span className="inline-flex w-40 items-center justify-start gap-2 rounded-md
  border border-red-400/30
  bg-red-400/10
  text-red-200
  px-3 py-1 text-xs"
>
  <Plug className="h-3.5 w-3.5 opacity-80" />
  DISCONNECTED
</span>
              )}
            </div>

            <div className="flex items-center justify-end gap-1">
              {r.kind === "restricted" ? (
                <Battery className="h-4 w-4 opacity-30" />
              ) : r.connected ? (
                <BatteryCharging className="h-4 w-4 opacity-80" />
              ) : (
                <Battery className="h-4 w-4 opacity-70" />
              )}

              <div className="w-12 text-right tabular-nums opacity-80">
                {r.kind === "restricted"
                  ? "--"
                  : r.connected
                    ? "100%"
                    : `${r.batteryPct}%`}
              </div>
            </div>
            <div />
              </div>

              <div
                className={[
                  "overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
                  open ? "max-h-56 opacity-100" : "max-h-0 opacity-0",
                ].join(" ")}
              >
                <div className="border-t border-white/5 bg-black/15 px-4 py-4">
                  <div className="grid gap-4 md:grid-cols-[44px_1fr_auto]">
                    <div />
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                        Quick profile preview
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                        <span className="text-white/85">{r.displayName}</span>
                        <span className="text-white/45">@{r.username}</span>
                        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs uppercase tracking-[0.12em] text-white/55">
                          {r.kind}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-white/45 md:grid-cols-3">
                        <div>
                          <span className="block uppercase tracking-[0.14em] text-white/30">
                            Character
                          </span>
                          <span className="mt-1 block truncate text-white/65">
                            {r.characterName ?? "no approved character"}
                          </span>
                        </div>
                        <div>
                          <span className="block uppercase tracking-[0.14em] text-white/30">
                            Presence
                          </span>
                          <span className="mt-1 block text-white/65">
                            {formatLastSeen(r.lastSeenAt, r.connected)}
                          </span>
                        </div>
                        <div>
                          <span className="block uppercase tracking-[0.14em] text-white/30">
                            Access
                          </span>
                          <span className="mt-1 block text-white/65">
                            {r.kind === "player" ? "approved player" : "registered guest"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start md:justify-end">
                      <Link
                        href={`/u/${encodeURIComponent(r.username)}`}
                        className="rounded-md border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.12em] text-white/70 hover:bg-white/6"
                      >
                        Open profile
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
}
