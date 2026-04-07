// src/app/shell/ShellTopBar.tsx
"use client";

import TopNavClient from "@/app/TopNavClient";
import HeaderClient from "@/app/HeaderClient";
import { useShellUI } from "@/app/shell/ShellUIContext";
import { SHELL_TOPBAR_HEIGHT } from "@/app/shell/shellMetrics";
import { useMyProfile } from "@/hooks/useMyProfile";

export default function ShellTopBar({ sseEventName }: { sseEventName?: string }) {
  const { toggleSidebar } = useShellUI();
  const { profile } = useMyProfile();
  const eurodollars = profile?.eurodollars ?? null;

  return (
    <div className="w-full bg-transparent" style={{ height: `${SHELL_TOPBAR_HEIGHT}px` }}>
      <div
        className="grid h-full items-stretch"
        style={{ gridTemplateColumns: `${SHELL_TOPBAR_HEIGHT}px ${SHELL_TOPBAR_HEIGHT}px 1fr auto ${SHELL_TOPBAR_HEIGHT}px` }}
      >
        <div className="group flex items-center justify-center bg-transparent">
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

        <div className="bg-transparent" style={{ height: `${SHELL_TOPBAR_HEIGHT}px`, width: `${SHELL_TOPBAR_HEIGHT}px` }}>
          <HeaderClient sseEventName={sseEventName} variant="topbar" />
        </div>

        <div className="flex h-full w-full items-start bg-transparent pt-3">
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

        <div className="h-full bg-transparent">
          <TopNavClient />
        </div>

        <div className="h-full w-full bg-transparent" />
      </div>
    </div>
  );
}
