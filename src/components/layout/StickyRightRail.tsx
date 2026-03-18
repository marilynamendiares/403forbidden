"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  sticky: ReactNode;
  children: ReactNode;
  contentOffset?: number;
};

export function StickyRightRail({
  sticky,
  children,
  contentOffset = 155,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const scrollNode = scrollRef.current;
    const stickyNode = stickyRef.current;
    if (!scrollNode || !stickyNode) return;

    let raf = 0;

    const updateSticky = () => {
      raf = 0;
      const y = Math.max(0, 72 - scrollNode.scrollTop);
      stickyNode.style.transform = `translateY(${y}px)`;
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
  }, []);

  return (
    <div className="relative h-full min-h-0 min-w-0 w-full">
      <div
        ref={stickyRef}
        className="absolute inset-x-0 top-0 z-30 will-change-transform"
      >
        <div className="pointer-events-auto flex justify-end pl-[72px]">
          {sticky}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="scrollbar-hidden h-full min-h-0 min-w-0 overflow-y-auto pb-10 pl-[72px]"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.06) 28px, rgba(0,0,0,0.18) 52px, rgba(0,0,0,0.48) 78px, rgba(0,0,0,0.82) 108px, #000 132px, #000 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.06) 28px, rgba(0,0,0,0.18) 52px, rgba(0,0,0,0.48) 78px, rgba(0,0,0,0.82) 108px, #000 132px, #000 100%)",
        }}
      >
        <div aria-hidden="true" className="h-[72px]" />
        <div aria-hidden="true" style={{ height: `${contentOffset - 72}px` }} />
        <div>{children}</div>
      </div>
    </div>
  );
}
