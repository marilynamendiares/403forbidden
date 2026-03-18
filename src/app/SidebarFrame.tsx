// src/app/SidebarFrame.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useShellScrollMode } from "./shell/ShellScrollMode";
import { useShellVariant } from "./shell/ShellVariantContext";
import { useShellSurface } from "./shell/ShellSurface";
import { useShellUI } from "./shell/ShellUIContext";

type Props = {
  topBar?: React.ReactNode;
  children: React.ReactNode;
};

export default function SidebarFrame({ topBar, children }: Props) {
  const { mode: scrollMode } = useShellScrollMode();
  const { variant } = useShellVariant();
  const { surface } = useShellSurface();
  const { sidebarOpen, restored, closeSidebar, openSidebar } = useShellUI();
  const [brandHover, setBrandHover] = useState(false);
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
    const onBrandHover = (e: Event) => {
      const ce = e as CustomEvent<{ hovered?: boolean }>;
      setBrandHover(Boolean(ce.detail?.hovered));
    };
    window.addEventListener("global-brand-hover", onBrandHover as EventListener);
    return () => window.removeEventListener("global-brand-hover", onBrandHover as EventListener);
  }, []);

  useEffect(() => {
    const recalcLeftRail = () => {
      const W = Math.min(window.innerWidth, 1920);
      const leftRail = Math.max(0, Math.min(W - 950 - 485, 485));
      setLeftRailPx(leftRail);
    };

    recalcLeftRail();
    window.addEventListener("resize", recalcLeftRail);
    return () => window.removeEventListener("resize", recalcLeftRail);
  }, []);

  useEffect(() => {
    if (!restored) return;
    let raf = window.requestAnimationFrame(() => {
      setPanelReady(true);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [restored]);

  const sidebarHoverNudgePx = useMemo(() => {
    if (!sidebarOpen || !brandHover) return 0;
    if (leftRailPx >= 250) return 0;
    // Restore a bit of left space for logo hover, capped to avoid layout jumps.
    return Math.min(120, Math.max(0, 220 - leftRailPx));
  }, [brandHover, leftRailPx, sidebarOpen]);

  const shellBodyBackground = surface === "light" ? "#D9D9D9" : "#1E1E1E";

  return (
    <div className="w-full min-h-screen">
      {/* centered artboard */}
<div className="mx-auto w-full min-h-screen overflow-x-hidden"
style={
{
  ["--W" as any]: "min(100vw, 1920px)",
  ["--center" as any]: "950px",
  ["--rail-max" as any]: "485px",

  // right rail держим дольше: появляется сразу после center, но capped 485
  ["--right-rail" as any]: "clamp(0px, calc(var(--W) - var(--center)), var(--rail-max))",

  // left rail появляется только когда есть место сверх (center + rail-max)
  ["--left-rail" as any]:
    "clamp(0px, calc(var(--W) - var(--center) - var(--rail-max)), var(--rail-max))",

  ["--left-peek-open" as any]: "var(--left-rail)",
  ["--sidebar-w" as any]: "calc(var(--W) - var(--left-peek-open))",
  ["--right-rail-w" as any]: "var(--right-rail)",

  ["--topbar-h" as any]: "72px",
} as React.CSSProperties
}
      >
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
  className="relative z-10 min-h-screen overflow-hidden"
  style={{
    width: "var(--left-peek-open)",
    maxWidth: "var(--rail-max)",
  }}
/>

{/* SIDEBAR PANEL */}
<section
  data-shell-panel
  className={[
    "absolute top-0 right-0 z-20 h-screen",
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
  {/* SVG filter defs (hidden) */}
  <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}>
    <defs>
      <filter id="shellNoiseFilter">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="6.29"
          numOctaves="6"
          stitchTiles="stitch"
        />
      </filter>
    </defs>
  </svg>

  {/* TOPBAR CHROME: one continuous white strip with a "hole" under active tab */}
  <div
    aria-hidden="true"
    className="shell-topbar-chrome"
    style={{
      position: "absolute",
      inset: "0 0 auto 0",
      height: "var(--topbar-h)",
      background: "#D9D9D9",
      zIndex: 1,
      pointerEvents: "none",
    }}
  />

{/* ONE unified noise overlay — gamma split: bright sparkles + dark sand */}
<svg
  aria-hidden="true"
  className="pointer-events-none absolute inset-0 w-full h-full"
  style={{ zIndex: 2 }}
  preserveAspectRatio="none"
>
  <defs>
    {/* Base monochrome noise */}
    <filter id="grainBase" x="0" y="0" width="100%" height="100%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="6.29"
        numOctaves="6"
        stitchTiles="stitch"
        seed="11"
        result="n"
      />
      <feColorMatrix in="n" type="saturate" values="0" result="g" />
      {/* tighten a bit so it feels like grain, not fog */}
      <feComponentTransfer in="g" result="c">
        <feFuncR type="gamma" amplitude="1" exponent="1.2" offset="0" />
        <feFuncG type="gamma" amplitude="1" exponent="1.2" offset="0" />
        <feFuncB type="gamma" amplitude="1" exponent="1.2" offset="0" />
      </feComponentTransfer>
    </filter>

    {/* DARK SAND: keep mostly low values (dark specks for white surfaces) */}
    <filter id="grainDarkSand" x="0" y="0" width="100%" height="100%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="6.29"
        numOctaves="6"
        stitchTiles="stitch"
        seed="11"
        result="n"
      />
      <feColorMatrix in="n" type="saturate" values="0" result="g" />
      {/* Pull down midtones -> more dark specks */}
      <feComponentTransfer in="g" result="sand">
        {/* slope < 1 compresses, intercept shifts darker/lighter */}
        <feFuncR type="linear" slope="0.78" intercept="0.20" />
        <feFuncG type="linear" slope="0.78" intercept="0.20" />
        <feFuncB type="linear" slope="0.78" intercept="0.20" />
      </feComponentTransfer>
      {/* Optional: make it a bit harsher (more “sand”) */}
      <feComponentTransfer in="sand">
        <feFuncR type="gamma" amplitude="1" exponent="1" offset="0" />
        <feFuncG type="gamma" amplitude="1" exponent="1" offset="0" />
        <feFuncB type="gamma" amplitude="1" exponent="1" offset="0" />
      </feComponentTransfer>
    </filter>

    {/* BRIGHT SPARKLES: isolate high values -> rare bright glitter for dark surfaces */}
    <filter id="grainBrightSparkles" x="0" y="0" width="100%" height="100%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="10.5"
        numOctaves="2"
        stitchTiles="stitch"
        seed="27"
        result="n"
      />
      <feColorMatrix in="n" type="saturate" values="0" result="g" />
      {/* Crush lows, lift highs -> “sparkle mask” */}
      <feComponentTransfer in="g" result="mask">
        {/* tableValues: black until very late, then quickly to white */}
        <feFuncR type="table" tableValues="0 0 0 0 0 0 0.05 0.25 0.75 1" />
        <feFuncG type="table" tableValues="0 0 0 0 0 0 0.05 0.25 0.75 1" />
        <feFuncB type="table" tableValues="0 0 0 0 0 0 0.05 0.25 0.75 1" />
      </feComponentTransfer>
      {/* Make them tiny and crisp */}
      <feComponentTransfer in="mask">
        <feFuncR type="gamma" amplitude="1" exponent="2.0" offset="0" />
        <feFuncG type="gamma" amplitude="1" exponent="2.0" offset="0" />
        <feFuncB type="gamma" amplitude="1" exponent="2.0" offset="0" />
      </feComponentTransfer>
    </filter>
  </defs>

  {/* 1) Dark sand: visible on WHITE (multiply) */}
  <rect
    width="100%"
    height="100%"
    fill="#2A2A2A"
    filter="url(#grainDarkSand)"
    opacity="0.20"
    style={{ mixBlendMode: "multiply" as any }}
  />

  {/* 2) Soft base grain (optional subtle unifier) */}
  <rect
    width="100%"
    height="100%"
    fill="#808080"
    filter="url(#grainBase)"
    opacity="0.02"
    style={{ mixBlendMode: "overlay" as any }}
  />

  {/* 3) Bright sparkles: visible on DARK (screen) */}
  <rect
    width="100%"
    height="100%"
    fill="#fff"
    filter="url(#grainBrightSparkles)"
    opacity="0.38"
    style={{ mixBlendMode: "screen" as any }}
  />
</svg>

{/* UI LAYER (clickable) */}
<div className="relative flex flex-col h-full" style={{ zIndex: 10 }}>
{/* TOPBAR (fixed inside sidebar) */}
{topBar ? (
  <div
    className="shrink-0 sticky top-0 z-30"
    style={{ height: "var(--topbar-h)", backgroundColor: "transparent" }}
  >
    {topBar}
  </div>
) : null}

{/* SCROLL BODY (only this scrolls) */}
<div
  className={[
    "flex-1 overflow-x-hidden",
    scrollMode === "split" ? "overflow-y-hidden" : "overflow-y-auto",
  ].join(" ")}
>
  <div
    className="grid"
    style={{
      gridTemplateColumns:
        variant === "full"
          ? "minmax(0, 1fr)"
          : "minmax(0, 1fr) var(--right-rail-w)",
      minHeight: scrollMode === "split" ? "100%" : "calc(100vh - var(--topbar-h))",
      height: scrollMode === "split" ? "100%" : undefined,
    }}
  >
    <main
      className={[
        "min-w-0 px-18 pb-10",
        scrollMode === "split" ? "h-full min-h-0 overflow-hidden" : "",
      ].join(" ")}
      style={{
        paddingTop: scrollMode === "split" ? "0px" : "72px",
        paddingLeft: scrollMode === "split" ? "0px" : "72px",
        paddingRight: "72px",
      }}
    >
      {children}
    </main>

    {variant === "center" ? (
      <aside
        className="border-l border-white/10 overflow-hidden"
        style={{ width: "var(--right-rail-w)" }}
      />
    ) : null}
  </div>
</div>

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
