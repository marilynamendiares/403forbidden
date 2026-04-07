"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { readLocalStorage, writeLocalStorage } from "@/lib/browserStorage";

type ShellUIState = {
  sidebarOpen: boolean;
  brandHover: boolean;
  restored: boolean;
  setSidebarOpen: (v: boolean) => void;
  setBrandHover: (v: boolean) => void;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
};

// ✅ export context so GlobalBrand can read it safely
export const ShellUIContext = createContext<ShellUIState | null>(null);

const LS_KEY = "403.shell.sidebarOpen";

export function ShellUIProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [brandHover, setBrandHover] = useState(false);
  const [restored, setRestored] = useState(false);

useEffect(() => {
  document.documentElement.dataset.sidebarOpen = sidebarOpen ? "1" : "0";
}, [sidebarOpen]);

  // restore
  useEffect(() => {
    try {
      const raw = readLocalStorage(LS_KEY);
      if (raw !== null) {
        setSidebarOpen(raw === "1");
      }
    } finally {
      setRestored(true);
    }
  }, []);

  // persist
  useEffect(() => {
    if (!restored) return;
    writeLocalStorage(LS_KEY, sidebarOpen ? "1" : "0");
  }, [restored, sidebarOpen]);

  const value = useMemo<ShellUIState>(() => {
    return {
      sidebarOpen,
      brandHover,
      restored,
      setSidebarOpen,
      setBrandHover,
      toggleSidebar: () => setSidebarOpen((v) => !v),
      openSidebar: () => setSidebarOpen(true),
      closeSidebar: () => setSidebarOpen(false),
    };
  }, [brandHover, restored, sidebarOpen]);

  return <ShellUIContext.Provider value={value}>{children}</ShellUIContext.Provider>;
}

export function useShellUI() {
  const v = useContext(ShellUIContext);
  if (!v) throw new Error("useShellUI must be used within ShellUIProvider");
  return v;
}
