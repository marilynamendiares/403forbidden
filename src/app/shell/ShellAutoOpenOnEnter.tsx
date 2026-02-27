"use client";

import { useEffect, useRef } from "react";
import { useShellUI } from "@/app/shell/ShellUIContext";

export default function ShellAutoOpenOnEnter() {
  const { restored, sidebarOpen, openSidebar } = useShellUI();
  const handledRef = useRef(false);

  useEffect(() => {
    if (!restored || handledRef.current) return;
    handledRef.current = true;

    // Open once on entering shell if currently closed.
    if (!sidebarOpen) {
      requestAnimationFrame(() => openSidebar());
    }
  }, [openSidebar, restored, sidebarOpen]);

  return null;
}
