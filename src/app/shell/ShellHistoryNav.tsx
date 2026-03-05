"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const NAV_KEY = "403.shell.history.nav";

type NavState = {
  entries: string[];
  pointer: number;
};

function readNavState(): NavState | null {
  try {
    const raw = sessionStorage.getItem(NAV_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NavState>;
    if (!Array.isArray(parsed.entries)) return null;
    if (typeof parsed.pointer !== "number") return null;
    if (parsed.entries.length === 0) return null;
    const pointer = Math.min(Math.max(0, parsed.pointer), parsed.entries.length - 1);
    return { entries: parsed.entries.map(String), pointer };
  } catch {
    return null;
  }
}

function writeNavState(state: NavState) {
  sessionStorage.setItem(NAV_KEY, JSON.stringify(state));
}

function inferTrail(pathname: string): string[] {
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0) return ["/"];
  const out: string[] = [];
  for (let i = 1; i <= segs.length; i += 1) {
    out.push(`/${segs.slice(0, i).join("/")}`);
  }
  return out;
}

export default function ShellHistoryNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [nav, setNav] = useState<NavState | null>(null);
  const [fallbackCanBack, setFallbackCanBack] = useState(false);

  useEffect(() => {
    const current = pathname || "/";
    const existing = readNavState();
    const navTiming = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const isReload = navTiming?.type === "reload";

    if (!existing || isReload) {
      const entries = inferTrail(current);
      const next = { entries, pointer: entries.length - 1 };
      writeNavState(next);
      setNav(next);
      setFallbackCanBack(window.history.length > 1);
      return;
    }

    if (existing.entries[existing.pointer] === current) {
      setNav(existing);
      setFallbackCanBack(window.history.length > 1);
      return;
    }

    if (
      existing.pointer < existing.entries.length - 1 &&
      existing.entries[existing.pointer + 1] === current
    ) {
      const next = { ...existing, pointer: existing.pointer + 1 };
      writeNavState(next);
      setNav(next);
      setFallbackCanBack(window.history.length > 1);
      return;
    }

    const nextEntries = existing.entries.slice(0, existing.pointer + 1);
    nextEntries.push(current);
    const next = { entries: nextEntries, pointer: nextEntries.length - 1 };
    writeNavState(next);
    setNav(next);
    setFallbackCanBack(window.history.length > 1);
  }, [pathname]);

  const hidden = useMemo(() => {
    return pathname === "/forum" || pathname === "/pager" || pathname === "/users";
  }, [pathname]);

  if (hidden) return null;

  const atArcsRoot = pathname === "/arcs";
  const canBack = atArcsRoot ? false : (nav?.pointer ?? 0) > 0 || fallbackCanBack;
  const canForward = nav ? nav.pointer < nav.entries.length - 1 : false;

  return (
    <div
      className="absolute flex items-center justify-center gap-6"
      style={{
        left: "72px",
        top: "var(--topbar-h)",
        width: "72px",
        height: "72px",
        zIndex: 15,
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (nav && nav.pointer > 0) {
            const next = { ...nav, pointer: nav.pointer - 1 };
            writeNavState(next);
            setNav(next);
            router.push(next.entries[next.pointer]!);
            return;
          }
          if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
          }
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
          if (nav && nav.pointer < nav.entries.length - 1) {
            const next = { ...nav, pointer: nav.pointer + 1 };
            writeNavState(next);
            setNav(next);
            router.push(next.entries[next.pointer]!);
            return;
          }
          router.forward();
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
