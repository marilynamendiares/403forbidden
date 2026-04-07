"use client";

import React, { createContext, useContext } from "react";
import {
  useStackedConfigRegistration,
  useStackedConfigValue,
} from "@/app/shell/stackedConfig";

export type ShellSurface = "dark" | "light";

const Ctx = createContext<{
  surface: ShellSurface;
  registerSurface: (id: string, surface: ShellSurface) => void;
  unregisterSurface: (id: string) => void;
} | null>(null);

export function ShellSurfaceProvider({ children }: { children: React.ReactNode }) {
  const { value: surface, registerValue, unregisterValue } = useStackedConfigValue<ShellSurface>("dark");
  const value = {
    surface,
    registerSurface: registerValue,
    unregisterSurface: unregisterValue,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShellSurface() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useShellSurface must be used within ShellSurfaceProvider");
  return value;
}

export default function ShellSurfaceSetter({ surface }: { surface: ShellSurface }) {
  const { registerSurface, unregisterSurface } = useShellSurface();
  useStackedConfigRegistration(registerSurface, unregisterSurface, surface);

  return null;
}
