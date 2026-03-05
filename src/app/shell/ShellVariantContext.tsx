"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type ShellVariant = "center" | "full";

const Ctx = createContext<{
  variant: ShellVariant;
  registerVariant: (id: string, v: ShellVariant) => void;
  unregisterVariant: (id: string) => void;
} | null>(null);

export function ShellVariantProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Array<{ id: string; variant: ShellVariant }>>([]);

  const registerVariant = useCallback((id: string, variant: ShellVariant) => {
    setEntries((prev) => {
      const next = prev.filter((entry) => entry.id !== id);
      next.push({ id, variant });
      return next;
    });
  }, []);

  const unregisterVariant = useCallback((id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const variant = entries.length > 0 ? entries[entries.length - 1]!.variant : "center";

  const value = useMemo(
    () => ({ variant, registerVariant, unregisterVariant }),
    [registerVariant, unregisterVariant, variant]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShellVariant() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useShellVariant must be used within ShellVariantProvider");
  return v;
}
