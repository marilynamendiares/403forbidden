// src/app/forum/ForumPinnedTiles.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

type Props = { bgUrl: string };

const H_TOP = 215;
const H_BOTTOM = 105;
const GAP = 26;

// “полотно” делаем выше, чтобы был длинный параллакс
const EXTRA = 380;

export default function ForumPinnedTiles({ bgUrl }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    let raf = 0;
    let target = 0;
    let current = 0;

    // меньше = плавнее (но слишком маленькое будет “вязко”)
    const EASING = 0.035;

    const onMove = (e: PointerEvent) => {
      const y = e.clientY / Math.max(1, window.innerHeight);
      const t = y * 2 - 1; // -1..1
      target = Math.max(-1, Math.min(1, t));
    };

    const animate = () => {
      current += (target - current) * EASING;
      el.style.setProperty("--py", current.toFixed(4));
      raf = requestAnimationFrame(animate);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  const totalH = H_TOP + GAP + H_BOTTOM;
  const canvasH = totalH + EXTRA;
  const canvasTop = -EXTRA / 2;
  const bottomOffset = H_TOP + GAP;

  return (
    <section
      ref={rootRef}
      className="relative w-full"
      style={
        {
          height: totalH,
          ["--py" as any]: "0",
          // ✅ инверсия параллакса (движение в противоположную сторону)
          ["--amp" as any]: "-46px",
        } as React.CSSProperties
      }
    >
      {/* TOP TILE */}
      <Link
        href="/forum/news/public"
        className="group absolute inset-x-0 top-0 overflow-hidden"
        style={{ height: H_TOP }}
      >
        {/* unified background canvas */}
        <div
          aria-hidden="true"
          className="absolute left-0 w-full"
          style={{
            top: canvasTop - 0,
            height: canvasH,
            backgroundImage: `url(${bgUrl})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: "translateY(calc(var(--py) * var(--amp)))",
            willChange: "transform",
          }}
        />

        {/* subtle cinematic shading (not glass) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.18))",
          }}
        />

        {/* ✅ hover inner border */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{ boxShadow: "inset 0 0 0 1px #D9D9D9" }}
        />

        <TileText title="ANNOUNCEMENTS" subtitle="OFFICIAL UPDATES" />
      </Link>

      {/* GAP = абсолютная пустота */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0"
        style={{ top: H_TOP, height: GAP }}
      />

      {/* BOTTOM TILE */}
      <Link
        href="/forum/news/devlog"
        className="group absolute inset-x-0 overflow-hidden"
        style={{ top: bottomOffset, height: H_BOTTOM }}
      >
        <div
          aria-hidden="true"
          className="absolute left-0 w-full"
          style={{
            top: canvasTop - bottomOffset,
            height: canvasH,
            backgroundImage: `url(${bgUrl})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: "translateY(calc(var(--py) * var(--amp)))",
            willChange: "transform",
          }}
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.22))",
          }}
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{ boxShadow: "inset 0 0 0 1px #D9D9D9" }}
        />

        <TileText title="CHANGELOG" subtitle="PLATFORM UPDATES" compact />
      </Link>
    </section>
  );
}

function TileText({
  title,
  subtitle,
  compact,
}: {
  title: string;
  subtitle: string;
  compact?: boolean;
}) {
  return (
    <div className="relative h-full w-full text-[#1E1E1E] group-hover:text-[#D9D9D9] transition-colors duration-200">
      <div className="pl-4 pt-4">
        <div
          className="header-font-archimoto uppercase font-black"
          style={{
            fontSize: compact ? 40 : 44,
            letterSpacing: "0.02em",
            lineHeight: 1,
          }}
        >
          {title}
        </div>

<div
  className="header-font-archimoto transition-colors duration-200 group-hover:text-[#D9D9D9]"
  style={{
    marginTop: 2,
    fontSize: 15,        // 15px
    fontWeight: 400,     // не black
    letterSpacing: 0,    // убрать tracking
    textTransform: "none", // убрать uppercase
  }}
>
  {subtitle}
</div>
      </div>
    </div>
  );
}