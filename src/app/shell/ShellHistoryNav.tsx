"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  SHELL_EDGE_GUTTER,
  SHELL_HISTORY_STRIP_WIDTH,
  SHELL_TOPBAR_HEIGHT,
  shellMetricVars,
} from "@/app/shell/shellMetrics";
import {
  advanceShellHistoryState,
  initShellHistoryState,
  isArcsPath,
  readShellHistoryState,
  type ShellHistoryState,
  writeShellHistoryState,
} from "@/app/shell/shellHistoryState";

export default function ShellHistoryNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [nav, setNav] = useState<ShellHistoryState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const current = pathname || "/";
    if (!isArcsPath(current)) {
      setNav(null);
      return;
    }

    const existing = readShellHistoryState();
    if (!existing) {
      const initialized = initShellHistoryState(current);
      writeShellHistoryState(initialized);
      setNav(initialized);
      return;
    }

    const next = advanceShellHistoryState(existing, current);
    writeShellHistoryState(next);
    setNav(next);
  }, [pathname]);

  const hidden = useMemo(() => !pathname || !isArcsPath(pathname), [pathname]);

  if (!hydrated || hidden || !nav) return null;

  const atArcsRoot = pathname === "/arcs";
  const canBack = atArcsRoot ? false : nav.index > 0;
  const canForward = nav.index < nav.entries.length - 1;

  return (
    <div
      className="absolute flex items-center justify-center gap-6"
      style={{
        left: `${SHELL_EDGE_GUTTER}px`,
        top: shellMetricVars.topbarHeight,
        width: `${SHELL_HISTORY_STRIP_WIDTH}px`,
        height: `${SHELL_TOPBAR_HEIGHT}px`,
        zIndex: 15,
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (!canBack) return;
          const next = { ...nav, index: nav.index - 1 };
          writeShellHistoryState(next);
          setNav(next);
          router.push(next.entries[next.index]!);
        }}
        disabled={!canBack}
        className="header-font-archimoto text-[24px] leading-none transition-colors disabled:cursor-default"
        style={{ color: canBack ? "#D9D9D9" : "#666666" }}
        aria-label="Back"
        title="Back"
      >
        ←
      </button>

      <button
        type="button"
        onClick={() => {
          if (!canForward) return;
          const next = { ...nav, index: nav.index + 1 };
          writeShellHistoryState(next);
          setNav(next);
          router.push(next.entries[next.index]!);
        }}
        disabled={!canForward}
        className="header-font-archimoto text-[24px] leading-none transition-colors disabled:cursor-default"
        style={{ color: canForward ? "#D9D9D9" : "#666666" }}
        aria-label="Forward"
        title="Forward"
      >
        →
      </button>
    </div>
  );
}
