"use client";

import { useRef, type ReactNode } from "react";
import { RAIL_STICKY_MASK_IMAGE, useRailStickyTransform } from "@/components/layout/railSticky";

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

  useRailStickyTransform(scrollRef, stickyRef);

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
          WebkitMaskImage: RAIL_STICKY_MASK_IMAGE,
          maskImage: RAIL_STICKY_MASK_IMAGE,
        }}
      >
        <div aria-hidden="true" className="h-[72px]" />
        <div aria-hidden="true" style={{ height: `${contentOffset - 72}px` }} />
        <div>{children}</div>
      </div>
    </div>
  );
}
