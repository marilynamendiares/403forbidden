"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const NAV_KEY = "403.shell.history.nav";

type NavState = {
  scope: "arcs";
  entries: string[];
  index: number;
};

function readNavState(): NavState | null {
  try {
    const raw = sessionStorage.getItem(NAV_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NavState>;
    if (parsed.scope !== "arcs") return null;
    if (!Array.isArray(parsed.entries)) return null;
    if (typeof parsed.index !== "number") return null;
    if (parsed.entries.length === 0) return null;
    const entries = parsed.entries.map(String).filter((entry) => entry.startsWith("/arcs"));
    if (entries.length === 0) return null;
    const index = Math.min(Math.max(0, parsed.index), entries.length - 1);
    return { scope: "arcs", entries, index };
  } catch {
    return null;
  }
}

function writeNavState(state: NavState) {
  sessionStorage.setItem(NAV_KEY, JSON.stringify(state));
}

function isArcsPath(pathname: string) {
  return pathname === "/arcs" || pathname.startsWith("/arcs/");
}

function inferArcsTrail(pathname: string): string[] {
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0 || segs[0] !== "arcs") return ["/arcs"];
  const out: string[] = [];
  for (let i = 1; i <= segs.length; i += 1) {
    out.push(`/${segs.slice(0, i).join("/")}`);
  }
  return out;
}

function initFromPath(pathname: string): NavState {
  const entries = inferArcsTrail(pathname);
  return {
    scope: "arcs",
    entries,
    index: entries.length - 1,
  };
}

export default function ShellHistoryNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [nav, setNav] = useState<NavState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const current = pathname || "/";
    if (!isArcsPath(current)) {
      setNav(null);
      return;
    }

    const existing = readNavState();
    if (!existing) {
      const initialized = initFromPath(current);
      writeNavState(initialized);
      setNav(initialized);
      return;
    }

    if (existing.entries[existing.index] === current) {
      setNav(existing);
      return;
    }

    if (existing.index > 0 && existing.entries[existing.index - 1] === current) {
      const next = { ...existing, index: existing.index - 1 };
      writeNavState(next);
      setNav(next);
      return;
    }

    if (existing.index < existing.entries.length - 1 && existing.entries[existing.index + 1] === current) {
      const next = { ...existing, index: existing.index + 1 };
      writeNavState(next);
      setNav(next);
      return;
    }

    const truncated = existing.entries.slice(0, existing.index + 1);
    const deduped = truncated[truncated.length - 1] === current ? truncated : [...truncated, current];
    const next = { scope: "arcs" as const, entries: deduped, index: deduped.length - 1 };
    writeNavState(next);
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
          if (!canBack) return;
          const next = { ...nav, index: nav.index - 1 };
          writeNavState(next);
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
          writeNavState(next);
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
