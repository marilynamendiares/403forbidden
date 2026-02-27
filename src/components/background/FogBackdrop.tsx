"use client";

import React from "react";

type Props = {
  opacity?: number;          // общая сила текстуры
  blendMode?: React.CSSProperties["mixBlendMode"]; // как смешиваем с #151515
};

/**
 * Big single procedural fog/grunge texture.
 * Not grain. One continuous layer. Covers full container.
 */
export default function FogBackdrop({
  opacity = 0.22,
  blendMode = "soft-light",
}: Props) {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{
        zIndex: 0,
        opacity,
        mixBlendMode: blendMode,
      }}
      preserveAspectRatio="none"
    >
      <defs>
        {/* 1) Low-frequency "clouds" */}
        <filter id="fogNoise" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012"
            numOctaves="4"
            seed="7"
            stitchTiles="stitch"
            result="n"
          />
          {/* 2) Shape it into “foggy blotches” (less flat, more grunge) */}
          <feComponentTransfer in="n" result="t">
            {/* lift mids a bit */}
            <feFuncR type="gamma" amplitude="1" exponent="0.85" offset="0" />
            <feFuncG type="gamma" amplitude="1" exponent="0.85" offset="0" />
            <feFuncB type="gamma" amplitude="1" exponent="0.85" offset="0" />
          </feComponentTransfer>

          {/* 3) Optional contrast (more “texture”, less pure fog) */}
          <feColorMatrix
            in="t"
            type="matrix"
            values="
              1.35 0    0    0   -0.18
              0    1.35 0    0   -0.18
              0    0    1.35 0   -0.18
              0    0    0    1    0
            "
            result="c"
          />
        </filter>
      </defs>

      {/* IMPORTANT:
         We paint neutral grey, then let blendMode do the work vs #151515.
         This keeps it “texture”, not “noise grain”. */}
      <rect width="100%" height="100%" fill="#808080" filter="url(#fogNoise)" />
    </svg>
  );
}