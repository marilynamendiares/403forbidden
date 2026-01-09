// src/app/TopNavClient.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type Item = {
  href: string;
  label: string;
  num: string;
};

const ITEMS: Item[] = [
  { href: "/forum", label: "FORUM", num: "01" },
  { href: "/archive", label: "ARCHIVE", num: "02" },
  { href: "/players", label: "PLAYERS", num: "03" },
  { href: "/books", label: "BOOKS", num: "04" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function TopNavClient() {
  const pathname = usePathname();

  const activeIdx = useMemo(() => {
    if (pathname === "/") return -1; // ✅ главная — ничего не активно
    return ITEMS.findIndex((it) => isActive(pathname, it.href));
  }, [pathname]);

  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const navRef = useRef<HTMLElement | null>(null);

  const [indicator, setIndicator] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  const tabClass = (active: boolean) =>
    [
      "relative inline-flex items-center gap-2",
      "px-4 py-2",
      "uppercase tracking-[0.22em]",
      "text-[12px] leading-none",
      "font-mono",
      "transition",
      "rounded-none",
      active
        ? "bg-white text-neutral-900"
        : "text-neutral-500 hover:text-neutral-300",
    ].join(" ");

  const numClass = (active: boolean) =>
    [
      "text-[12px] leading-none tabular-nums",
      active ? "text-neutral-400" : "text-white/90",
    ].join(" ");

  const recalc = () => {
    if (activeIdx < 0) return; // ✅ нет активной вкладки — не считаем
    const nav = navRef.current;
    const el = linkRefs.current[activeIdx];
    if (!nav || !el) return;

    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    setIndicator({
      left: elRect.left - navRect.left,
      width: elRect.width,
    });
  };

  useLayoutEffect(() => {
    recalc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  useEffect(() => {
    const onResize = () => recalc();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  return (
    <nav ref={navRef} className="relative flex items-center justify-center gap-6">
      {ITEMS.map((it, idx) => {
        const active = idx === activeIdx;

        return (
          <Link
            key={it.href}
            href={it.href}
            ref={(node) => {
              linkRefs.current[idx] = node;
            }}
            className={tabClass(active)}
          >
            <span>{it.label}</span>
            <span className={numClass(active)}>{it.num}</span>
          </Link>
        );
      })}

      <div className="absolute left-0 right-0 -bottom-3 h-px bg-white/10" />

      {activeIdx >= 0 && (
        <div
          className="absolute -bottom-3 h-0.5 bg-white transition-[left,width] duration-200 ease-out"
          style={{
            left: indicator.left,
            width: indicator.width,
          }}
        />
      )}
    </nav>
  );
}
