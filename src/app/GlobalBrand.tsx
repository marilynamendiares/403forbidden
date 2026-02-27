// src/app/GlobalBrand.tsx
"use client";

import Link from "next/link";
import BrandMark from "@/app/BrandMark";
import { useContext } from "react";
import { ShellUIContext } from "@/app/shell/ShellUIContext";

export default function GlobalBrand() {
  const shell = useContext(ShellUIContext);
  const sidebarOpen = shell?.sidebarOpen ?? false;
  const setBrandHover = (hovered: boolean) => {
    window.dispatchEvent(
      new CustomEvent("global-brand-hover", {
        detail: { hovered },
      })
    );
  };

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
            "uppercase",
            "text-[15px] leading-none",
            "text-foreground hover:text-white transition",
            "select-none",
          ].join(" ")}
        >
          <BrandMark text="403 Forbidden" tail={sidebarOpen ? "<" : "_"} />
        </Link>
      </div>
    </div>
  );
}
