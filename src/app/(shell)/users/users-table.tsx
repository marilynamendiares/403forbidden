"use client";

import { useMemo } from "react";
import { BatteryCharging, Battery, HardDrive, PlugZap, Plug, Waypoints } from "lucide-react";
import { usePresence } from "@/hooks/usePresence";

type Row = {
  id: string;
  username: string;
  fullName: string;
  batteryPct: number;
  kind: "player" | "restricted";
};

export default function UsersTable({ initialRows }: { initialRows: Row[] }) {
  const { onlineIds } = usePresence();

  const rows = useMemo(() => {
    return initialRows.map((r) => {
      const connected = onlineIds.has(r.id);
      return { ...r, connected };
    });
  }, [initialRows, onlineIds]);

  // 👇 ключевой момент: "Full name" больше НЕ 420px
  // Подгони 280px/300px/320px по вкусу.
  const GRID =
  // compact first (small screens): hide full name column and shrink status/battery
  "grid-cols-[44px_1fr_140px_110px_24px] " +
  // wide on md+: show full name column + comfortable battery
  "md:grid-cols-[44px_220px_1fr_140px_140px_24px]";


return (
  <div className="w-full">
    {/* keep table readable on ultrawide */}
    <div className="mx-auto w-full max-w-350 rounded-2xl border border-white/10 bg-white/3">

<div
  className={`grid w-full ${GRID} gap-2 px-4 py-3 text-xs font-mono uppercase tracking-[0.22em] opacity-60`}
>
  <div></div>
  <div>User</div>

  {/* full name only on md+ */}
  <div className="hidden md:block">Full name</div>

  <div>Status</div>
  <div className="text-right">Battery</div>
  <div></div>
</div>


      <div className="divide-y divide-white/5">
        {rows.map((r) => (
          <div
            key={r.id}
            className={`grid w-full ${GRID} items-center gap-2 px-4 py-3 text-sm hover:bg-white/4 ${
              r.kind === "restricted" ? "text-white/70" : ""
            }`}
          >
            <div className="flex items-center justify-center">
              {r.kind === "restricted" ? (
                <span className="text-xs font-mono opacity-40">--</span>
              ) : (
                <HardDrive className="h-4 w-4 opacity-70" />
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="opacity-80">@{r.username}</span>
            </div>

            <div className="hidden md:block opacity-80 truncate">{r.fullName}</div>

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
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}
