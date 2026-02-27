"use client";

import React, { useId } from "react";

type NoiseOverlayProps = {
  className?: string;
  style?: React.CSSProperties;
  /** overall opacity of the overlay */
  opacity?: number;
  /** default: "normal" */
  blendMode?: React.CSSProperties["mixBlendMode"];
  /** tweak per-surface if needed */
  sandOpacity?: number;     // dark specks (white surfaces)
  sparkleOpacity?: number;  // bright specks (dark surfaces)
};

export default function NoiseOverlay({
  className,
  style,
  opacity = 1,
  blendMode = "normal",
  sandOpacity = 0.22,
  sparkleOpacity = 0.10,
}: NoiseOverlayProps) {
  const uid = useId();
  const sandId = `grainDarkSand-${uid}`;
  const sparkId = `grainBrightSparkles-${uid}`;

  return (
    <svg
      aria-hidden="true"
      className={className}
      style={{ ...style, opacity, mixBlendMode: blendMode as any }}
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      pointerEvents="none"
    >
      <defs>
        {/* DARK SAND: visible on LIGHT surfaces */}
        <filter id={sandId} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="6.29"
            numOctaves="6"
            stitchTiles="stitch"
            seed="11"
            result="n"
          />
          <feColorMatrix in="n" type="saturate" values="0" result="g" />
          <feComponentTransfer in="g" result="sand">
            <feFuncR type="linear" slope="0.65" intercept="0.05" />
            <feFuncG type="linear" slope="0.65" intercept="0.05" />
            <feFuncB type="linear" slope="0.65" intercept="0.05" />
          </feComponentTransfer>
          <feComponentTransfer in="sand">
            <feFuncR type="gamma" amplitude="1" exponent="1.35" offset="0" />
            <feFuncG type="gamma" amplitude="1" exponent="1.35" offset="0" />
            <feFuncB type="gamma" amplitude="1" exponent="1.35" offset="0" />
          </feComponentTransfer>
        </filter>

        {/* BRIGHT SPARKLES: visible on DARK surfaces */}
        <filter id={sparkId} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="10.5"
            numOctaves="2"
            stitchTiles="stitch"
            seed="27"
            result="n"
          />
          <feColorMatrix in="n" type="saturate" values="0" result="g" />
          <feComponentTransfer in="g" result="mask">
            <feFuncR type="table" tableValues="0 0 0 0 0 0 0.05 0.25 0.75 1" />
            <feFuncG type="table" tableValues="0 0 0 0 0 0 0.05 0.25 0.75 1" />
            <feFuncB type="table" tableValues="0 0 0 0 0 0 0.05 0.25 0.75 1" />
          </feComponentTransfer>
          <feComponentTransfer in="mask">
            <feFuncR type="gamma" amplitude="1" exponent="2.0" offset="0" />
            <feFuncG type="gamma" amplitude="1" exponent="2.0" offset="0" />
            <feFuncB type="gamma" amplitude="1" exponent="2.0" offset="0" />
          </feComponentTransfer>
        </filter>
      </defs>

      {/* dark specks for whites */}
      <rect
        width="100%"
        height="100%"
        fill="#000"
        filter={`url(#${sandId})`}
        opacity={sandOpacity}
        style={{ mixBlendMode: "multiply" as any }}
        pointerEvents="none"
      />

      {/* bright specks for blacks */}
      <rect
        width="100%"
        height="100%"
        fill="#fff"
        filter={`url(#${sparkId})`}
        opacity={sparkleOpacity}
        style={{ mixBlendMode: "screen" as any }}
        pointerEvents="none"
      />
    </svg>
  );
}