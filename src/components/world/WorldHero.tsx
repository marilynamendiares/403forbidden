// src/components/world/WorldHero.tsx
"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Globe from "@/components/Globe";
import BackCornerButton from "@/components/BackCornerButton";
import {
  type CSSVarStyle,
  interWordJustify,
  mixedTextOrientation,
  verticalWritingMode,
} from "@/lib/uiStyles";

const BRACKET_ROWS = [
  "52.0° N",
  "04.3° E",
  "NET: SATLINK",
  "PING: 42MS",
  "2226:04/11:22",
] as const;


// Artboard
const BASE_W = 1600;
const TILE_H = 240;            // то, что было BASE_H
const DISCLAIMER_H = 72;       // место под “THIS FILE…”
const TOTAL_H = TILE_H + DISCLAIMER_H;

const LEFT_W = 380;
const RIGHT_W = 380;
const CENTER_W = BASE_W - LEFT_W - RIGHT_W;

// Side rails
const RAIL_W = 16;               // тонкий rail
const PANEL_W = LEFT_W - RAIL_W; // 388
const SIDE_LABEL = "DEN\u00A0HAAg";

// “микро-поджатие” к краю (оптика). Отрицательное — ближе к левому краю.
// Для правого делаем зеркально.
const LABEL_EDGE_NUDGE_L = -1; // попробуй -1..-2
const LABEL_EDGE_NUDGE_R = 1;  // зеркально

// Размер типографики рейла = размер кнопок (как в рефе)
const RAIL_FONT = 24;
const BTN_SIZE = 16;
const BTN_GAP = 8;
const RAIL_PAD = 10;
const LEFT_FRAME_W = 8; // толщина светлой рамки (в артборде)

const G = 18; // можно потом поиграться: 16 / 18 / 20
const EJECT_W = 110;

function RailIcons({
  icons,
  padProp,
}: {
  icons: Array<{ src: string; opacityClass: string }>;
  padProp: "paddingTop" | "paddingBottom";
}) {
  return (
    <div
      className="flex flex-col items-center opacity-100"
      style={{ [padProp]: RAIL_PAD, gap: BTN_GAP }}
    >
      {icons.map((icon) => (
        <img
          key={`${padProp}:${icon.src}`}
          src={icon.src}
          alt=""
          draggable={false}
          className={`block ${icon.opacityClass}`}
          style={{ width: BTN_SIZE, height: BTN_SIZE }}
        />
      ))}
    </div>
  );
}

function SideRail({
  side,
  label,
  labelEdgeNudge,
  buttonsAt,
  icons,
}: {
  side: "left" | "right";
  label: string;
  labelEdgeNudge: number;
  buttonsAt: "top" | "bottom";
  icons: Array<{ src: string; opacityClass: string }>;
}) {
  const isLeft = side === "left";
  const labelBlock = (
    <div
      className="opacity-80"
      style={{
        [buttonsAt === "top" ? "paddingBottom" : "paddingTop"]: RAIL_PAD,
        transform: `translateX(${labelEdgeNudge}px)`,
      }}
    >
      <div
        className="font-osiris whitespace-nowrap select-none"
        style={{
          fontSize: RAIL_FONT,
          lineHeight: `${RAIL_FONT}px`,
          letterSpacing: "0.02em",
          writingMode: verticalWritingMode,
          textOrientation: mixedTextOrientation,
          ...(isLeft ? { transform: "rotate(180deg)" } : {}),
        }}
      >
        {label}
      </div>
    </div>
  );

  const buttonsBlock = (
    <RailIcons
      icons={icons}
      padProp={buttonsAt === "top" ? "paddingTop" : "paddingBottom"}
    />
  );

  return (
    <div
      className={`absolute top-0 h-full flex flex-col items-center ${isLeft ? "left-0" : "right-0"}`}
      style={{ width: RAIL_W }}
    >
      {buttonsAt === "top" ? buttonsBlock : labelBlock}
      <div className="flex-1" />
      {buttonsAt === "top" ? labelBlock : buttonsBlock}
    </div>
  );
}

function BracketRow({ text, dim = false }: { text: string; dim?: boolean }) {
  const [hot, setHot] = useState(false);
  const offRef = useRef<number | null>(null);

  const onEnter = () => {
    if (offRef.current) window.clearTimeout(offRef.current);
    offRef.current = null;
    setHot(true);
  };

  const onLeave = () => {
    if (offRef.current) window.clearTimeout(offRef.current);
    offRef.current = window.setTimeout(() => {
      setHot(false);
      offRef.current = null;
    }, 500); // ← вот эта “полсекунды после ухода”
  };

  useEffect(() => {
    return () => {
      if (offRef.current) window.clearTimeout(offRef.current);
    };
  }, []);

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={[
        "relative inline-grid items-center",
        "font-archimoto uppercase select-none",
        "text-[12px] leading-none tracking-[0.02em]",
        dim ? "text-[#D9D9D9]/60" : "text-[#D9D9D9]",
      ].join(" ")}
      style={{
        gridTemplateColumns: "max-content var(--brk-col, max-content) max-content",
        columnGap: 12,
      }}
    >
      {/* rectangle (появляется сразу, исчезает спустя 500ms) */}
      <div
        className={[
          "absolute inset-0 pointer-events-none",
          "transition-opacity duration-150",
          hot ? "opacity-100" : "opacity-0",
        ].join(" ")}
        style={{ background: "#D9D9D9" }}
      />

      {/* left bracket */}
      <span className={["relative z-10 transition-opacity duration-150", hot ? "opacity-0" : "opacity-100"].join(" ")}>
        [
      </span>

      {/* text */}
      <span
        className={[
          "brk-text relative z-10 whitespace-nowrap text-left",
          "transition-colors duration-150",
          hot ? "text-[#1E1E1E]" : "",
        ].join(" ")}
        style={{ width: "var(--brk-col, auto)" }}
      >
        {text}
      </span>

      {/* right bracket */}
      <span className={["relative z-10 transition-opacity duration-150", hot ? "opacity-0" : "opacity-100"].join(" ")}>
        ]
      </span>
    </div>
  );
}







export default function WorldHero() {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const globeWrapRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    let raf = 0;

    const apply = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = el.clientWidth;
        const s = w / BASE_W;
        el.style.setProperty("--hero-s", String(s));
      });
    };

    apply();

    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("resize", apply);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  useEffect(() => {
  const el = globeWrapRef.current;
  if (!el) return;

  let raf = 0;

  const onMove = (e: MouseEvent) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const vh = Math.max(1, window.innerHeight);
      const t = (e.clientY / vh - 0.5) * 2; // -1..1
      const amp = 8; // px амплитуда (подгони 4..12)
      el.style.transform = `translateY(${-t * amp}px)`;
    });
  };

  window.addEventListener("mousemove", onMove, { passive: true });

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("mousemove", onMove);
  };
}, []);


  return (
    <section className="pt-[70px] pb-[70px]">
      <div
  ref={boxRef}
  className="relative w-full"
  style={{
    // держим высоту в той же системе, что и скейл
    height: `calc(${TOTAL_H}px * var(--hero-s, 1))`,
  }}
>
<div
  className="absolute left-1/2 top-0"
  style={{
    width: BASE_W,
    height: TOTAL_H,
    transform: `translateX(-50%) scale(var(--hero-s, 1))`,
    transformOrigin: "top center",
  }}
>
{/* ======= HERO TILE ======= */}
<div className="relative w-full" style={{ height: TILE_H }}>
          <div className="relative w-full h-full">
            {/* ================= LEFT ================= */}
            <div className="absolute left-0 top-0 h-full" style={{ width: LEFT_W }}>
              <div className="relative h-full">
                {/* LEFT RAIL: buttons TOP, label BOTTOM */}
                <SideRail
                  side="left"
                  label={SIDE_LABEL}
                  labelEdgeNudge={LABEL_EDGE_NUDGE_L}
                  buttonsAt="top"
                  icons={[
                    { src: "/icon2.svg", opacityClass: "opacity-100" },
                    { src: "/icon1.svg", opacityClass: "opacity-80" },
                  ]}
                />

                {/* LEFT PANEL */}
                <div className="absolute top-0 h-full" style={{ left: RAIL_W, width: PANEL_W }}>
{/* FRAME (толстая рамка без “пустоты”) */}
<div
  className="absolute inset-[10px] border border-white/70"
  style={{
    borderWidth: LEFT_FRAME_W,
    borderRadius: "0 26px 26px 0", // как у тебя, только толще бордер
  }}
/>

{/* INNER (вплотную к рамке: inset = 10 + LEFT_FRAME_W) */}
<div
  className="absolute overflow-hidden"
  style={{
    inset: `${10 + LEFT_FRAME_W}px`,
    borderRadius: "0 20px 20px 0",
    background: "#1E1E1E",
  }}
>
<div className="absolute inset-4" style={{ left: 6 }}>
  <div
    ref={(node) => {
      if (!node) return;

      // измеряем самый длинный текст и фиксируем ширину для всех строк
      // (это гарантирует, что колонка с ']' будет идеально ровной)
      requestAnimationFrame(() => {
        const texts = Array.from(node.querySelectorAll<HTMLElement>(".brk-text"));
        const max = Math.max(0, ...texts.map((el) => el.offsetWidth));
        node.style.setProperty("--brk-col", `${max}px`);
      });
    }}
    className={[
      "h-full flex flex-col justify-between items-start",
      "font-archimoto uppercase",
      "text-[12px] leading-none tracking-[0.02em]",
      "text-[#D9D9D9]",
    ].join(" ")}
  >
{/* верхняя группа — строго колонка */}
<div className="flex flex-col gap-6 items-start">
  <BracketRow text={BRACKET_ROWS[0]} />
  <BracketRow text={BRACKET_ROWS[1]} />
  <BracketRow text={BRACKET_ROWS[2]} />
</div>

{/* нижняя группа — строго колонка */}
<div className="flex flex-col gap-6 items-start">
  <BracketRow text={BRACKET_ROWS[3]} dim />
  <BracketRow text={BRACKET_ROWS[4]} dim />
</div>

  </div>
</div>





<div
  ref={globeWrapRef}
  className="absolute right-[-50px] top-[20px] w-[260px] h-[260px] opacity-95"
  style={{ willChange: "transform", transition: "transform 120ms linear" }}
>
  <Globe size={280} />
</div>

                  </div>
                </div>
              </div>
            </div>

{/* ================= CENTER ================= */}
<div
  className="absolute top-0 h-full overflow-hidden"
  style={{ left: LEFT_W, width: CENTER_W }}
>
  <div
    className="relative h-full select-none pointer-events-none"
    style={{
      // 1) чтобы не липло к верхнему краю (артборд px)
      // подгони потом 10..18, но держи как ОДИН источник правды
      paddingTop: 10,

      // 2) параметры слоёв (в процентах, как ты описал)
      // cut = сколько отрезаем сверху
      // shift = насколько опускаем слой вниз
      // (эти проценты легко тюнить, не ломая верстку)
      "--o1-cut": "35%",
      "--o1-shift": "90%",
      "--o2-cut": "70%",
      "--o2-shift": "143%",
    } as CSSVarStyle}
  >
    <div className="relative w-full">
      {/* WHITE FILL (верхний) */}
      <img
        src="/0verv1ew-fill.svg"
        alt="OVERVIEW"
        draggable={false}
        className="block w-full"
          style={{
    filter: "brightness(0.85)",
  }}
      />

      {/* OUTLINE LAYER #1 (срез ~40%) */}
      <div
        className="absolute left-0 top-0 w-full opacity-[0.95]"
        style={{
          clipPath: "inset(var(--o1-cut) 0 0 0)",
          transform: "translateY(var(--o1-shift))",
        }}
        aria-hidden
      >
        <div
          className="w-full aspect-[959/104]"
          style={{
            // градиент "сверху bg -> снизу white"
            background: "linear-gradient(to bottom, #1E1E1E 30%, #D9D9D9 100%)",

            // делаем SVG маской, чтобы градиент был ВНУТРИ outline
            WebkitMaskImage: "url(/0verv1ew-outline.svg)",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            WebkitMaskSize: "contain",

            maskImage: "url(/0verv1ew-outline.svg)",
            maskRepeat: "no-repeat",
            maskPosition: "center",
            maskSize: "contain",
          }}
        />
      </div>

      {/* OUTLINE LAYER #2 (срез ~85%) */}
      <div
        className="absolute left-0 top-0 w-full opacity-[0.95]"
        style={{
          clipPath: "inset(var(--o2-cut) 0 0 0)",
          transform: "translateY(var(--o2-shift))",
        }}
        aria-hidden
      >
        <div
          className="w-full aspect-[959/104]"
          style={{
            background: "linear-gradient(to bottom, #1E1E1E 70%, #D9D9D9 100%)",
            WebkitMaskImage: "url(/0verv1ew-outline.svg)",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            WebkitMaskSize: "contain",
            maskImage: "url(/0verv1ew-outline.svg)",
            maskRepeat: "no-repeat",
            maskPosition: "center",
            maskSize: "contain",
          }}
        />
      </div>
    </div>
  </div>
</div>



            {/* ================= RIGHT ================= */}
            <div className="absolute right-0 top-0 h-full" style={{ width: RIGHT_W }}>
              <div className="relative h-full">
                {/* RIGHT RAIL: label TOP, buttons BOTTOM */}
                <SideRail
                  side="right"
                  label={SIDE_LABEL}
                  labelEdgeNudge={LABEL_EDGE_NUDGE_R}
                  buttonsAt="bottom"
                  icons={[
                    { src: "/icon1.svg", opacityClass: "opacity-80" },
                    { src: "/icon2.svg", opacityClass: "opacity-100" },
                  ]}
                />

{/* RIGHT PANEL */}
<div className="absolute top-0 h-full" style={{ right: RAIL_W, width: PANEL_W }}>
  <div
    className="absolute inset-[10px] bg-white/80"
    style={{ borderRadius: "0 0 0 26px" }} // TL TR BR BL
  />

{/* CONTENT AREA */}
<div className="absolute inset-[10px]">
  {/* LEFT: BARCODE */}
  <div
    className="absolute"
    style={{
      left: G,
      top: G,
      right: G + EJECT_W + G, // ← barcode | gap | arrow
    }}
  >
    <img
      src="/barcode.svg"
      alt="Barcode"
      draggable={false}
      className="block w-full h-auto"
      style={{ maxWidth: 211 }} // фигма-ширина
    />

    <div
      className="mt-1 text-center font-archimoto text-[10px] tracking-[0.02em]"
      style={{ color: "#1E1E1E" }}
    >
      2801202618070020134
    </div>
  </div>

{/* RIGHT: EJECT */}
<div
  className="absolute"
  style={{
    right: G,
    top: G,
    width: EJECT_W,
    height: 130,
  }}
>
  <BackCornerButton
    variant="eject"
    ariaLabel="Back"
    className="h-full w-full"
  />
</div>
</div>

</div>


              </div>
            </div>
          </div>
          </div>
          {/* ======= /HERO TILE ======= */}
{/* ======= DISCLAIMER (внутри артборда, СКЕЙЛИТСЯ вместе с hero) ======= */}
<div
  className="absolute"
  style={{
    top: TILE_H + 18,
    right: RAIL_W + 10, // как и было: выравнивание по правому краю белого блока
    width: 590, // было 520 → +50px
  }}
>
  {/* основной текст: слева, “растянут” по ширине */}
  <div
    className="font-archimoto uppercase text-[12px] leading-[1.55] tracking-[0.02em] opacity-40 text-[#D9D9D9]"
    style={{
      textAlign: "justify",
      textJustify: interWordJustify,
    }}
  >
    THIS FILE CONTAINS A CURATED REPRESENTATION OF THE PUBLICLY AVAILABLE STRUCTURE OF THE CITY.
    INFORMATION PRESENTED HERE IS INTENDED FOR ORIENTATION PURPOSES ONLY. CERTAIN DATASETS HAVE BEEN
    REFORMATTED TO MAINTAIN SYSTEM CONSISTENCY AND OPERATIONAL STABILITY.
  </div>

  {/* статус: строго справа */}
  <div className="mt-5 text-right font-archimoto uppercase text-[12px] leading-none tracking-[0.02em] opacity-40 text-[#D9D9D9]">
    CONTENT STATUS: VERIFIED
  </div>
</div>


        </div>
      </div>
    </section>
  );
}
