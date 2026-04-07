"use client";

import React, { createContext, useContext } from "react";
import { useStackedConfigValue } from "@/app/shell/stackedConfig";

export type ShellVariant = "center" | "full";

const Ctx = createContext<{
  variant: ShellVariant;
  registerVariant: (id: string, v: ShellVariant) => void;
  unregisterVariant: (id: string) => void;
} | null>(null);

export function ShellVariantProvider({ children }: { children: React.ReactNode }) {
  const { value: variant, registerValue, unregisterValue } =
    useStackedConfigValue<ShellVariant>("center");
  const value = {
    variant,
    registerVariant: registerValue,
    unregisterVariant: unregisterValue,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShellVariant() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useShellVariant must be used within ShellVariantProvider");
  return v;
}
