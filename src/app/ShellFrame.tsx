// src/app/ShellFrame.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useShellScrollMode } from "./shell/ShellScrollMode";
import { useShellVariant } from "./shell/ShellVariantContext";
import { useShellSurface } from "./shell/ShellSurface";
import { useShellUI } from "./shell/ShellUIContext";
import ShellPanelChrome from "./shell/ShellPanelChrome";
import ShellPanelBody from "./shell/ShellPanelBody";
import {
  getShellLeftRailPx,
  getShellSidebarHoverNudgePx,
  SHELL_ARTBOARD_MAX_WIDTH,
  SHELL_CENTER_WIDTH,
  SHELL_RAIL_MAX_WIDTH,
  SHELL_TOPBAR_HEIGHT,
} from "@/app/shell/shellMetrics";
import {
  type CSSVarStyle,
} from "@/lib/uiStyles";

type Props = {
  topBar?: React.ReactNode;
  children: React.ReactNode;
};

const sidebarFrameVars: CSSVarStyle = {
  "--W": `min(100vw, ${SHELL_ARTBOARD_MAX_WIDTH}px)`,
  "--center": `${SHELL_CENTER_WIDTH}px`,
  "--rail-max": `${SHELL_RAIL_MAX_WIDTH}px`,
  "--right-rail": "clamp(0px, calc(var(--W) - var(--center)), var(--rail-max))",
  "--left-rail": "clamp(0px, calc(var(--W) - var(--center) - var(--rail-max)), var(--rail-max))",
  "--left-peek-open": "var(--left-rail)",
  "--sidebar-w": "calc(var(--W) - var(--left-peek-open))",
  "--right-rail-w": "var(--right-rail)",
  "--topbar-h": `${SHELL_TOPBAR_HEIGHT}px`,
};

export default function ShellFrame({ topBar, children }: Props) {
  const { mode: scrollMode } = useShellScrollMode();
  const { variant } = useShellVariant();
  const { surface } = useShellSurface();
  const { sidebarOpen, brandHover, restored, closeSidebar, openSidebar, setShellActive } = useShellUI();
  const [leftRailPx, setLeftRailPx] = useState(0);
  const [panelReady, setPanelReady] = useState(false);

  // Esc closes sidebar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeSidebar]);

  useEffect(() => {
    const recalcLeftRail = () => {
      setLeftRailPx(getShellLeftRailPx(window.innerWidth));
    };

    recalcLeftRail();
    window.addEventListener("resize", recalcLeftRail);
    return () => window.removeEventListener("resize", recalcLeftRail);
  }, []);

  useEffect(() => {
    setShellActive(true);
    return () => setShellActive(false);
  }, [setShellActive]);

  useEffect(() => {
    if (!restored) return;
    const raf = window.requestAnimationFrame(() => {
      setPanelReady(true);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [restored]);

  const sidebarHoverNudgePx = useMemo(() => {
    if (!sidebarOpen || !brandHover) return 0;
    return getShellSidebarHoverNudgePx(leftRailPx);
  }, [brandHover, leftRailPx, sidebarOpen]);

  const shellBodyBackground = surface === "light" ? "#D9D9D9" : "#1E1E1E";

  return (
    <div className="w-full min-h-screen">
      {/* centered artboard */}
<div className="mx-auto w-full min-h-screen overflow-x-hidden" style={sidebarFrameVars}>
{/* ARTBOARD (acts as a clip-mask for sidebar) */}
<div
  className="relative min-h-screen mx-auto overflow-hidden"
  style={{ width: "var(--W)" }}
>
{/* BACKGROUND LAYER */}
<div
  className="absolute inset-0"
  style={{ backgroundColor: "transparent" }}
  aria-hidden="true"
/>

{/* LEFT PEEK (keep geometry, brand moved to GlobalBrand) */}
<aside
  className="relative z-10 min-h-screen overflow-hidden pointer-events-none"
  style={{
    width: "var(--left-peek-open)",
    maxWidth: "var(--rail-max)",
  }}
/>

{/* SIDEBAR PANEL */}
<section
  data-shell-panel
  className={[
    "absolute top-0 right-0 z-30 h-screen",
    "flex flex-col",
    "will-change-transform transition-transform duration-450 ease-out",
    "border-l border-white/10",
    "overflow-hidden",
  ].join(" ")}
  style={{
    width: "var(--sidebar-w)",
    backgroundColor: shellBodyBackground,
    isolation: "isolate",
    visibility: panelReady ? "visible" : "hidden",
    transform: sidebarOpen
      ? `translateX(${sidebarHoverNudgePx}px)`
      : "translateX(100%)",
  }}
  aria-hidden={!sidebarOpen}
>
  <ShellPanelChrome />
  <div className="relative z-10 flex h-full flex-col">
    {topBar ? (
      <div
        className="sticky top-0 z-30 shrink-0"
        style={{ height: "var(--topbar-h)", backgroundColor: "transparent" }}
      >
        {topBar}
      </div>
    ) : null}
    <ShellPanelBody scrollMode={scrollMode} variant={variant}>
      {children}
    </ShellPanelBody>
  </div>
</section>

{!sidebarOpen ? (
  <div
    className="fixed top-0 pointer-events-none"
    style={{
      right: "calc((100vw - min(100vw, 1920px)) / 2)",
      zIndex: 30,
    }}
  >
    <div className="p-6 pointer-events-auto">
      <button
        type="button"
        onClick={openSidebar}
        className={[
          "header-font-archimoto",
          "text-[15px] leading-none",
          "text-foreground hover:text-white transition",
          "select-none",
        ].join(" ")}
        aria-label="Open sidebar"
        title="Open"
      >
        ◁
      </button>
    </div>
  </div>
) : null}
        </div>
      </div>
    </div>
  );
}
