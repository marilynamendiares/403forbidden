// src/app/TopNavClient.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SHELL_TOPBAR_HEIGHT } from "@/app/shell/shellMetrics";

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

export default function TopNavClient() {
  const pathname = usePathname();

  return (
    <nav
      className="flex h-full items-stretch justify-end gap-x-16"
      style={{ background: "transparent", minHeight: `${SHELL_TOPBAR_HEIGHT}px` }}
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
              "inline-flex w-auto items-center justify-start",
              "select-none",
              "uppercase",
              "text-[15px] leading-none",
              "header-font-archimoto",
            ].join(" ")}
            style={{ background: "transparent" }}
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
