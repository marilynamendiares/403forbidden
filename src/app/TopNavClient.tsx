// src/app/TopNavClient.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

const NAV = [
  { href: "/forum", label: "F0RUM", num: "01" },
  { href: "/arcs", label: "ARCS", num: "02" },
  { href: "/pager", label: "PAGER", num: "03" },
  { href: "/users", label: "USERS", num: "04" },
] as const;

function isActive(pathname: string, href: (typeof NAV)[number]["href"]) {
  if (href === "/forum") return pathname === "/forum" || pathname.startsWith("/forum/");
  return pathname === href || pathname.startsWith(href + "/");
}

function setHoleVars() {
  const activeEl = document.querySelector(
    '[data-topnav-item="true"][data-active="true"]'
  ) as HTMLElement | null;
  if (!activeEl) return;

  const panel = activeEl.closest("[data-shell-panel]") as HTMLElement | null;
  if (!panel) return;

  const pRect = panel.getBoundingClientRect();
  const aRect = activeEl.getBoundingClientRect();

  const x = Math.max(0, aRect.left - pRect.left);
  const w = Math.max(0, aRect.width);

  panel.style.setProperty("--hole-x", `${x}px`);
  panel.style.setProperty("--hole-w", `${w}px`);
}

export default function TopNavClient() {
  const pathname = usePathname();
  const tabWidth = "calc((var(--right-rail-w) - 72px) / 3)";

  useLayoutEffect(() => {
    setHoleVars();

    const onResize = () => setHoleVars();
    window.addEventListener("resize", onResize);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => setHoleVars());
      const panel = document.querySelector("[data-shell-panel]") as HTMLElement | null;
      if (panel) ro.observe(panel);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [pathname]);

  return (
    <nav
      className="h-full flex items-stretch"
      style={{
        background: "transparent",
        width: `calc(${tabWidth} * 4)`,
      }}
    >
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            data-topnav-item="true"
            data-active={active ? "true" : "false"}
            className={[
              "h-full",
              "shrink-0",
              "inline-flex items-center justify-center",
              "select-none",
              "uppercase",
              "text-[15px] leading-none",
              "header-font-archimoto",
            ].join(" ")}
            style={{
              width: tabWidth,
              // inactive tabs are painted by the topbar chrome strip underneath
              // active is a hole to the sidebar background
              background: "transparent",
            }}
          >
            <span style={{ color: active ? "rgba(217,217,217,0.70)" : "#111" }}>
              {item.label}
            </span>

            <span className="ml-2" style={{ color: active ? "#FFFFFF" : "rgba(0,0,0,0.45)" }}>
              {item.num}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
