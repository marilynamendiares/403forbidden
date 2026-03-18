// src/app/GlobalBackground.tsx
export default function GlobalBackground() {
  return (
    <>
      {/* WORLD BASE */}
      <div aria-hidden="true" className="fixed inset-0" style={{ backgroundColor: "#000", zIndex: 0 }} />

      {/* ARTBOARD BASE */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-1/2 h-screen"
        style={{
          transform: "translateX(-50%)",
          width: "min(100vw, 1920px)",
          backgroundColor: "#151515",
          zIndex: 1,
        }}
      />

      {/* PROGRESSIVE SHADOW STACK (full artboard overlay, under grain) */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-1/2 h-screen pointer-events-none"
        style={{
          transform: "translateX(-50%)",
          width: "min(100vw, 1920px)",
          zIndex: 1,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: [
              "radial-gradient(130% 95% at 92% 8%, rgba(165,165,165,0.065) 0%, rgba(165,165,165,0.03) 32%, rgba(165,165,165,0) 62%)",
              "radial-gradient(140% 120% at 12% 92%, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0.16) 40%, rgba(0,0,0,0) 72%)",
              "linear-gradient(135deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.11) 42%, rgba(0,0,0,0.04) 100%)",
            ].join(", "),
            boxShadow: [
              "inset 0 0 0 1px rgba(165, 165, 165, 0.025)",
              "inset 9px -9px 9px -0.5px rgba(0, 0, 0, 0.05)",
              "inset 18px -18px 18px -1.5px rgba(0, 0, 0, 0.1)",
              "inset 37px -37px 37px -3px rgba(0, 0, 0, 0.16)",
              "inset 75px -75px 75px -6px rgba(0, 0, 0, 0.23)",
              "inset 150px -150px 150px -12px rgba(0, 0, 0, 0.32)",
            ].join(", "),
          }}
        />
      </div>

      {/* ARTBOARD NOISE — procedural, resolution-independent */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-1/2 h-screen pointer-events-none overflow-hidden"
        style={{
          transform: "translateX(-50%)",
          width: "min(100vw, 1920px)",
          zIndex: 2,
        }}
      >
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="bgGrainBase" x="0" y="0" width="100%" height="100%">
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

            <filter id="bgGrainDarkSand" x="0" y="0" width="100%" height="100%">
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
                <feFuncR type="linear" slope="0.58" intercept="0.03" />
                <feFuncG type="linear" slope="0.58" intercept="0.03" />
                <feFuncB type="linear" slope="0.58" intercept="0.03" />
              </feComponentTransfer>
              <feComponentTransfer in="sand">
                <feFuncR type="gamma" amplitude="1" exponent="1.55" offset="0" />
                <feFuncG type="gamma" amplitude="1" exponent="1.55" offset="0" />
                <feFuncB type="gamma" amplitude="1" exponent="1.55" offset="0" />
              </feComponentTransfer>
            </filter>

            <filter id="bgGrainBrightSparkles" x="0" y="0" width="100%" height="100%">
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
                <feFuncR type="table" tableValues="0 0 0 0 0 0 0 0.12 0.68 1" />
                <feFuncG type="table" tableValues="0 0 0 0 0 0 0 0.12 0.68 1" />
                <feFuncB type="table" tableValues="0 0 0 0 0 0 0 0.12 0.68 1" />
              </feComponentTransfer>
              <feComponentTransfer in="mask">
                <feFuncR type="gamma" amplitude="1" exponent="2.35" offset="0" />
                <feFuncG type="gamma" amplitude="1" exponent="2.35" offset="0" />
                <feFuncB type="gamma" amplitude="1" exponent="2.35" offset="0" />
              </feComponentTransfer>
            </filter>

            <filter id="bgSaltSpecks" x="0" y="0" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="16"
                numOctaves="1"
                stitchTiles="stitch"
                seed="91"
                result="n"
              />
              <feColorMatrix in="n" type="saturate" values="0" result="g" />
              <feComponentTransfer in="g" result="saltMask">
                <feFuncR type="linear" slope="70" intercept="-68.6" />
                <feFuncG type="linear" slope="70" intercept="-68.6" />
                <feFuncB type="linear" slope="70" intercept="-68.6" />
              </feComponentTransfer>
            </filter>

            <filter id="bgPepperSpecks" x="0" y="0" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="16"
                numOctaves="1"
                stitchTiles="stitch"
                seed="117"
                result="n"
              />
              <feColorMatrix in="n" type="saturate" values="0" result="g" />
              <feComponentTransfer in="g" result="pepperMask">
                <feFuncR type="linear" slope="-70" intercept="1.4" />
                <feFuncG type="linear" slope="-70" intercept="1.4" />
                <feFuncB type="linear" slope="-70" intercept="1.4" />
              </feComponentTransfer>
            </filter>
          </defs>

          <rect
            width="100%"
            height="100%"
            fill="#000"
            filter="url(#bgGrainDarkSand)"
            opacity="0.24"
            style={{ mixBlendMode: "multiply" as any }}
          />

          <rect
            width="100%"
            height="100%"
            fill="#808080"
            filter="url(#bgGrainBase)"
            opacity="0.02"
            style={{ mixBlendMode: "overlay" as any }}
          />

          <rect
            width="100%"
            height="100%"
            fill="#fff"
            filter="url(#bgGrainBrightSparkles)"
            opacity="0.32"
            style={{ mixBlendMode: "screen" as any }}
          />

          <rect
            width="100%"
            height="100%"
            fill="#fff"
            filter="url(#bgSaltSpecks)"
            opacity="0.62"
            style={{ mixBlendMode: "normal" as any }}
          />

          <rect
            width="100%"
            height="100%"
            fill="#000"
            filter="url(#bgPepperSpecks)"
            opacity="0.32"
            style={{ mixBlendMode: "normal" as any }}
          />
        </svg>

        {/*
          Canvas salt&pepper experiment (disabled for now).
          If needed, we can restore it from history and re-enable as a separate layer.
        */}
      </div>
    </>
  );
}
