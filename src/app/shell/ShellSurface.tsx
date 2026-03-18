"use client";

import React, { createContext, useCallback, useContext, useId, useMemo, useState } from "react";

export type ShellSurface = "dark" | "light";

const Ctx = createContext<{
  surface: ShellSurface;
  registerSurface: (id: string, surface: ShellSurface) => void;
  unregisterSurface: (id: string) => void;
} | null>(null);

export function ShellSurfaceProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Array<{ id: string; surface: ShellSurface }>>([]);

  const registerSurface = useCallback((id: string, surface: ShellSurface) => {
    setEntries((prev) => {
      const next = prev.filter((entry) => entry.id !== id);
      next.push({ id, surface });
      return next;
    });
  }, []);

  const unregisterSurface = useCallback((id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const surface = entries.length > 0 ? entries[entries.length - 1]!.surface : "dark";

  const value = useMemo(
    () => ({ surface, registerSurface, unregisterSurface }),
    [registerSurface, surface, unregisterSurface]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShellSurface() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useShellSurface must be used within ShellSurfaceProvider");
  return value;
}

export default function ShellSurfaceSetter({ surface }: { surface: ShellSurface }) {
  const { registerSurface, unregisterSurface } = useShellSurface();
  const id = useId();

  React.useEffect(() => {
    registerSurface(id, surface);
    return () => unregisterSurface(id);
  }, [id, registerSurface, surface, unregisterSurface]);

  return null;
}
