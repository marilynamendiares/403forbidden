"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type ShellVariant = "center" | "full";

const Ctx = createContext<{
  variant: ShellVariant;
  setVariant: (v: ShellVariant) => void;
} | null>(null);

export function ShellVariantProvider({ children }: { children: React.ReactNode }) {
  const [variant, setVariant] = useState<ShellVariant>("center");
  const value = useMemo(() => ({ variant, setVariant }), [variant]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShellVariant() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useShellVariant must be used within ShellVariantProvider");
  return v;
}
