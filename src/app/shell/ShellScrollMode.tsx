"use client";

import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from "react";

export type ShellScrollMode = "page" | "split";

const Ctx = createContext<{
  mode: ShellScrollMode;
  registerMode: (id: string, mode: ShellScrollMode) => void;
  unregisterMode: (id: string) => void;
} | null>(null);

export function ShellScrollModeProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Array<{ id: string; mode: ShellScrollMode }>>([]);

  const registerMode = useCallback((id: string, mode: ShellScrollMode) => {
    setEntries((prev) => {
      const next = prev.filter((entry) => entry.id !== id);
      next.push({ id, mode });
      return next;
    });
  }, []);

  const unregisterMode = useCallback((id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const mode = entries.length > 0 ? entries[entries.length - 1]!.mode : "page";

  const value = useMemo(
    () => ({ mode, registerMode, unregisterMode }),
    [mode, registerMode, unregisterMode]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShellScrollMode() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useShellScrollMode must be used within ShellScrollModeProvider");
  return value;
}

export default function ShellScrollModeSetter({ mode }: { mode: ShellScrollMode }) {
  const { registerMode, unregisterMode } = useShellScrollMode();
  const id = useId();

  useEffect(() => {
    registerMode(id, mode);
    return () => unregisterMode(id);
  }, [id, mode, registerMode, unregisterMode]);

  return null;
}
