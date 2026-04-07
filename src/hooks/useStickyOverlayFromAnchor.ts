"use client";

import { useEffect } from "react";

type Options = {
  scrollRef: React.RefObject<HTMLElement | null>;
  overlayRef: React.RefObject<HTMLElement | null>;
  anchorRef: React.RefObject<HTMLElement | null>;
  dependencyKey?: string | number;
};

export function useStickyOverlayFromAnchor({
  scrollRef,
  overlayRef,
  anchorRef,
  dependencyKey,
}: Options) {
  useEffect(() => {
    const scrollNode = scrollRef.current;
    const overlayNode = overlayRef.current;
    const anchorNode = anchorRef.current;
    if (!scrollNode || !overlayNode || !anchorNode) return;

    let raf = 0;

    const updateOverlay = () => {
      raf = 0;
      const initialTop = anchorNode.offsetTop;
      const y = Math.max(0, initialTop - scrollNode.scrollTop);
      overlayNode.style.transform = `translateY(${y}px)`;
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(updateOverlay);
    };

    updateOverlay();
    scrollNode.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      scrollNode.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [anchorRef, overlayRef, scrollRef, dependencyKey]);
}
