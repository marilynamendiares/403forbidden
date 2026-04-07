"use client";

import { useEffect, type MutableRefObject } from "react";

export const RAIL_STICKY_MASK_IMAGE =
  "linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.06) 28px, rgba(0,0,0,0.18) 52px, rgba(0,0,0,0.48) 78px, rgba(0,0,0,0.82) 108px, #000 132px, #000 100%)";

export function useRailStickyTransform(
  scrollRef: MutableRefObject<HTMLDivElement | null>,
  stickyRef: MutableRefObject<HTMLDivElement | null>,
  onUpdate?: (scrollNode: HTMLDivElement) => void
) {
  useEffect(() => {
    const scrollNode = scrollRef.current;
    const stickyNode = stickyRef.current;
    if (!scrollNode || !stickyNode) return;

    let raf = 0;

    const updateSticky = () => {
      raf = 0;
      const y = Math.max(0, 72 - scrollNode.scrollTop);
      stickyNode.style.transform = `translateY(${y}px)`;
      onUpdate?.(scrollNode);
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(updateSticky);
    };

    updateSticky();
    scrollNode.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      scrollNode.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [onUpdate, scrollRef, stickyRef]);
}
