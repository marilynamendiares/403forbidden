import type React from "react";
import {
  mixBlendMultiply,
  mixBlendOverlay,
  mixBlendScreen,
} from "@/lib/uiStyles";

export default function ShellPanelChrome() {
  return (
    <>
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

      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ zIndex: 2 }}
        preserveAspectRatio="none"
      >
        <defs>
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
            <feComponentTransfer in="g" result="c">
              <feFuncR type="gamma" amplitude="1" exponent="1.2" offset="0" />
              <feFuncG type="gamma" amplitude="1" exponent="1.2" offset="0" />
              <feFuncB type="gamma" amplitude="1" exponent="1.2" offset="0" />
            </feComponentTransfer>
          </filter>

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
            <feComponentTransfer in="g" result="sand">
              <feFuncR type="linear" slope="0.78" intercept="0.20" />
              <feFuncG type="linear" slope="0.78" intercept="0.20" />
              <feFuncB type="linear" slope="0.78" intercept="0.20" />
            </feComponentTransfer>
            <feComponentTransfer in="sand">
              <feFuncR type="gamma" amplitude="1" exponent="1" offset="0" />
              <feFuncG type="gamma" amplitude="1" exponent="1" offset="0" />
              <feFuncB type="gamma" amplitude="1" exponent="1" offset="0" />
            </feComponentTransfer>
          </filter>

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

        <rect
          width="100%"
          height="100%"
          fill="#2A2A2A"
          filter="url(#grainDarkSand)"
          opacity="0.20"
          style={{ mixBlendMode: mixBlendMultiply }}
        />
        <rect
          width="100%"
          height="100%"
          fill="#808080"
          filter="url(#grainBase)"
          opacity="0.02"
          style={{ mixBlendMode: mixBlendOverlay }}
        />
        <rect
          width="100%"
          height="100%"
          fill="#fff"
          filter="url(#grainBrightSparkles)"
          opacity="0.38"
          style={{ mixBlendMode: mixBlendScreen }}
        />
      </svg>
    </>
  );
}
