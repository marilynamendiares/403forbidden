import { readSessionStorage, writeSessionStorage } from "@/lib/browserStorage";

const NAV_KEY = "403.shell.history.nav";

export type ShellHistoryState = {
  scope: "arcs";
  entries: string[];
  index: number;
};

export function isArcsPath(pathname: string) {
  return pathname === "/arcs" || pathname.startsWith("/arcs/");
}

function inferArcsTrail(pathname: string): string[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0 || segments[0] !== "arcs") return ["/arcs"];

  const entries: string[] = [];
  for (let index = 1; index <= segments.length; index += 1) {
    entries.push(`/${segments.slice(0, index).join("/")}`);
  }
  return entries;
}

export function initShellHistoryState(pathname: string): ShellHistoryState {
  const entries = inferArcsTrail(pathname);
  return {
    scope: "arcs",
    entries,
    index: entries.length - 1,
  };
}

export function readShellHistoryState(): ShellHistoryState | null {
  const raw = readSessionStorage(NAV_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ShellHistoryState>;
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

export function writeShellHistoryState(state: ShellHistoryState) {
  writeSessionStorage(NAV_KEY, JSON.stringify(state));
}

export function advanceShellHistoryState(
  existing: ShellHistoryState | null,
  pathname: string
): ShellHistoryState {
  if (!existing) {
    return initShellHistoryState(pathname);
  }

  if (existing.entries[existing.index] === pathname) {
    return existing;
  }

  if (existing.index > 0 && existing.entries[existing.index - 1] === pathname) {
    return { ...existing, index: existing.index - 1 };
  }

  if (existing.index < existing.entries.length - 1 && existing.entries[existing.index + 1] === pathname) {
    return { ...existing, index: existing.index + 1 };
  }

  const truncated = existing.entries.slice(0, existing.index + 1);
  const entries = truncated[truncated.length - 1] === pathname ? truncated : [...truncated, pathname];
  return { scope: "arcs", entries, index: entries.length - 1 };
}
