"use client";

import { useEffect, useRef } from "react";
import { ShellScrollModeProvider } from "./ShellScrollMode";
import { ShellVariantProvider } from "./ShellVariantContext";
import { ShellSurfaceProvider } from "./ShellSurface";
import { useShellUI } from "./ShellUIContext";

function ShellAutoOpenBehavior() {
  const { restored, sidebarOpen, openSidebar } = useShellUI();
  const handledRef = useRef(false);

  useEffect(() => {
    if (!restored || handledRef.current) return;
    handledRef.current = true;

    if (!sidebarOpen) {
      requestAnimationFrame(() => openSidebar());
    }
  }, [openSidebar, restored, sidebarOpen]);

  return null;
}

export default function ShellProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ShellAutoOpenBehavior />
      <ShellVariantProvider>
        <ShellSurfaceProvider>
          <ShellScrollModeProvider>{children}</ShellScrollModeProvider>
        </ShellSurfaceProvider>
      </ShellVariantProvider>
    </>
  );
}
