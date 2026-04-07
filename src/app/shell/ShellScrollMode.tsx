"use client";

import React, { createContext, useContext } from "react";
import {
  useStackedConfigRegistration,
  useStackedConfigValue,
} from "@/app/shell/stackedConfig";

export type ShellScrollMode = "page" | "split";

const Ctx = createContext<{
  mode: ShellScrollMode;
  registerMode: (id: string, mode: ShellScrollMode) => void;
  unregisterMode: (id: string) => void;
} | null>(null);

export function ShellScrollModeProvider({ children }: { children: React.ReactNode }) {
  const { value: mode, registerValue, unregisterValue } =
    useStackedConfigValue<ShellScrollMode>("page");
  const value = {
    mode,
    registerMode: registerValue,
    unregisterMode: unregisterValue,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShellScrollMode() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useShellScrollMode must be used within ShellScrollModeProvider");
  return value;
}

export default function ShellScrollModeSetter({ mode }: { mode: ShellScrollMode }) {
  const { registerMode, unregisterMode } = useShellScrollMode();
  useStackedConfigRegistration(registerMode, unregisterMode, mode);

  return null;
}
