// src/app/shell/ShellTopBar.tsx
"use client";

import { useEffect, useState } from "react";
import TopNavClient from "@/app/TopNavClient";
import HeaderClient from "@/app/HeaderClient";
import { useShellUI } from "@/app/shell/ShellUIContext";

export default function ShellTopBar({ sseEventName }: { sseEventName?: string }) {
  const { toggleSidebar } = useShellUI();
  const [eurodollars, setEurodollars] = useState<number | null>(null);

  useEffect(() => {
    let abort = false;

    (async () => {
      try {
        const r = await fetch("/api/profile", { cache: "no-store" });
        if (!r.ok) return;
        const p = await r.json();
        const value = typeof p?.eurodollars === "number" ? p.eurodollars : 0;
        if (!abort) setEurodollars(value);
      } catch {
        // ignore
      }
    })();

    return () => {
      abort = true;
    };
  }, []);

  return (
    <div className="w-full" style={{ height: 72, background: "transparent" }}>
      <div className="grid h-full grid-cols-[72px_72px_1fr_auto_72px] items-stretch">
        {/* LEFT 72: burger */}
        <div
          className="group flex items-center justify-center"
          style={{ background: "transparent" }}
        >
          <button
            type="button"
            onClick={toggleSidebar}
            className={[
              "h-10 w-10 rounded-md bg-transparent",
              "inline-flex items-center justify-center",
              "text-black/70 transition-colors",
              "focus:outline-none",
            ].join(" ")}
            aria-label="Close sidebar"
            title="Close"
          >
            <span
              className={[
                "header-font-archimoto",
                "text-[18px] leading-none",
                "opacity-0 transition-opacity duration-150",
                "group-hover:opacity-100 group-focus-within:opacity-100",
              ].join(" ")}
              style={{ fontFeatureSettings: '"ss01" 1' }}
              aria-hidden="true"
            >
              X
            </span>
          </button>
        </div>

        {/* AVATAR 72 */}
        <div className="h-18 w-18" style={{ background: "transparent" }}>
          <HeaderClient sseEventName={sseEventName} variant="topbar" />
        </div>

        {/* BALANCE AREA */}
        <div
          className="h-full w-full flex items-start"
          style={{ background: "transparent", paddingTop: "12px" }}
        >
          {eurodollars !== null ? (
            <div
              className="header-font-archimoto inline-flex items-center gap-4 text-[15px] leading-none select-none"
              style={{ paddingLeft: "12px" }}
            >
              <span style={{ color: "rgba(0,0,0,0.45)" }}>€$</span>
              <span className="tabular-nums" style={{ color: "#111" }}>
                {eurodollars}
              </span>
            </div>
          ) : null}
        </div>

        {/* TABS AREA */}
        <div className="h-full" style={{ background: "transparent" }}>
          <TopNavClient />
        </div>

        {/* RIGHT 72 */}
        <div className="h-full w-full" style={{ background: "transparent" }} />
      </div>
    </div>
  );
}
