"use client";

import { useRouter } from "next/navigation";
import CornerArrow from "@/components/CornerArrow";

type Variant = "corner" | "eject";

export default function BackCornerButton({
  fallbackHref = "/forum",
  className = "",
  ariaLabel = "Back",
  variant = "corner",
}: {
  fallbackHref?: string;
  className?: string;
  ariaLabel?: string;
  variant?: Variant;
}) {
  const router = useRouter();

  const onClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  // === EJECT VARIANT (uses your public/eject-arrow*.svg) ===
  if (variant === "eject") {
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={onClick}
        className={[
          "group relative inline-flex items-center justify-center",
          // размеры задаёшь снаружи через className (h-[130px] w-[110px] и т.п.)
          className,
        ].join(" ")}
      >
        {/* FILL (default) */}
        <img
          src="/eject-arrow.svg?v=2"
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain opacity-100 group-hover:opacity-0 transition-opacity"
        />

        {/* OUTLINE (on hover) */}
        <img
          src="/eject-arrow-outline.svg?v=2"
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </button>
    );
  }

  // === DEFAULT CORNER BUTTON (your existing one) ===
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center",
        "h-12 w-12",
        "border border-white/20 bg-white/2 hover:bg-white/5",
        "transition",
        className,
      ].join(" ")}
    >
      <CornerArrow variant="inline" direction="left" />
    </button>
  );
}
