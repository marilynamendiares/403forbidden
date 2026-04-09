// src/app/GlobalBrand.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BrandMark from "@/app/BrandMark";
import { useShellUI } from "@/app/shell/ShellUIContext";

export default function GlobalBrand() {
  const { sidebarOpen, setBrandHover } = useShellUI();
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
  const terminalLines = useMemo(
    () => [
      "early development build",
      `id ${buildId.toLowerCase()}`,
      "",
      "> initializing neural-link protocols...",
      "encrypted connection",
      "tls 4.0 / node_eu_west_3",
      "",
      "this network operates beyond rogue-ai reach",
      "",
      "> run diagnostic --full",
      "[ok] memory 82% available",
      "[ok] cpu threads 16/16 active",
      "",
      "> scanning for anomalies...",
      "[clear] no threats detected",
    ],
    [buildId]
  );
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);

    const id = window.setInterval(() => {
      setVisibleCount((value) => {
        if (value >= terminalLines.length) {
          window.clearInterval(id);
          return value;
        }

        return value + 1;
      });
    }, 1450);

    return () => window.clearInterval(id);
  }, [terminalLines.length]);

  return (
    <>
      {sidebarOpen ? (
        <div
          className="fixed top-0 pointer-events-none"
          style={{
            left: "calc((100vw - min(100vw, 1920px)) / 2)",
            zIndex: 40,
          }}
          aria-hidden="true"
        >
          <Link
            href="/"
            aria-label="Go to home"
            className="pointer-events-auto block h-[72px]"
            style={{ width: "min(320px, var(--left-rail))" }}
            onMouseEnter={() => setBrandHover(true)}
            onMouseLeave={() => setBrandHover(false)}
          />
        </div>
      ) : null}

      <div
        className="fixed top-0 pointer-events-none global-brand"
        style={{
          left: "calc((100vw - min(100vw, 1920px)) / 2)",
          zIndex: 5,
        }}
      >
        <div
          className="px-3 pointer-events-auto"
          onMouseEnter={() => setBrandHover(true)}
          onMouseLeave={() => setBrandHover(false)}
          onFocus={() => setBrandHover(true)}
          onBlur={() => setBrandHover(false)}
        >
        <Link
          href="/"
          className={[
            "header-font-archimoto",
            "relative inline-flex h-[72px] items-center pl-[68px]",
            "uppercase",
            "text-[15px] leading-none",
            "text-foreground hover:text-white transition",
            "select-none",
          ].join(" ")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/globalbrand.gif"
            alt="403 Forbidden logo"
            className="pointer-events-none absolute left-0 top-1/2 h-14 w-14 -translate-y-1/2 scale-150 object-contain"
          />
          <BrandMark
            text="403 Forbidden"
            tail="_"
            className="leading-none"
          />
        </Link>

        <div className="pointer-events-none absolute left-0 top-[108px] px-3">
          <div
            className="pl-[68px] flex max-w-[420px] flex-col gap-1 overflow-hidden font-mono text-[9px] leading-none text-[#7E7E7E]"
            style={{ textTransform: "none" }}
          >
            {terminalLines.slice(0, visibleCount).map((line, index) =>
              line === "" ? (
                <div key={`gap-${index}`} className="h-4" aria-hidden="true" />
              ) : (
                <div key={`${index}-${line}`} className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {line}
                </div>
              )
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
