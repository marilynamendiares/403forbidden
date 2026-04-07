// src/app/GlobalBrand.tsx
"use client";

import Link from "next/link";
import BrandMark from "@/app/BrandMark";
import { useShellUI } from "@/app/shell/ShellUIContext";

export default function GlobalBrand() {
  const { sidebarOpen, setBrandHover } = useShellUI();
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

  return (
    <div
      className="fixed top-0 pointer-events-none global-brand"
      style={{
        left: "calc((100vw - min(100vw, 1920px)) / 2)",
        zIndex: 15, // above regular content, below sidebar (z-20)
      }}
    >
      <div
        className="p-6 pointer-events-auto"
        onMouseEnter={() => setBrandHover(true)}
        onMouseLeave={() => setBrandHover(false)}
        onFocus={() => setBrandHover(true)}
        onBlur={() => setBrandHover(false)}
      >
        <Link
          href="/"
          className={[
            "header-font-archimoto",
            "inline-flex flex-col items-start",
            "uppercase",
            "text-[15px] leading-none",
            "text-foreground hover:text-white transition",
            "select-none",
          ].join(" ")}
        >
          <BrandMark
            text="403 Forbidden"
            tail={sidebarOpen ? "<" : "_"}
            className="leading-none"
          />
          <span className="mt-1 block w-full text-[8px] leading-none tracking-[0.13em] text-[#7E7E7E]">
            EARLY DEVELOPMENT BUILD
          </span>
          <span className="mt-1 block w-full text-[8px] leading-none tracking-[0.13em] text-[#7E7E7E]">
            #{buildId}
          </span>
        </Link>
      </div>
    </div>
  );
}
