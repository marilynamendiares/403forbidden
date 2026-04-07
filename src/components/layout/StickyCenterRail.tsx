"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { RAIL_STICKY_MASK_IMAGE, useRailStickyTransform } from "@/components/layout/railSticky";

type Props = {
  breadcrumb: ReactNode;
  stickySuffix?: ReactNode;
  children: ReactNode;
};

export function StickyCenterRail({ breadcrumb, stickySuffix, children }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const breadcrumbRef = useRef<HTMLDivElement | null>(null);
  const suffixRef = useRef<HTMLSpanElement | null>(null);

  const updateSuffixReveal = useCallback((scrollNode: HTMLDivElement) => {
    const titleNode = scrollNode.querySelector<HTMLElement>("[data-sticky-title]");
    if (!suffixRef.current || !titleNode) return;

    const titleBottom =
      titleNode.getBoundingClientRect().bottom -
      scrollNode.getBoundingClientRect().top;
    const reveal = titleBottom <= 12;
    suffixRef.current.style.opacity = reveal ? "1" : "0";
  }, []);

  useRailStickyTransform(scrollRef, breadcrumbRef, updateSuffixReveal);

  return (
    <div className="relative h-full min-h-0 min-w-0 w-full">
      <div
        ref={breadcrumbRef}
        className="absolute inset-x-0 top-0 z-30 will-change-transform"
      >
        <div className="pointer-events-auto inline-flex w-fit items-center gap-2 pl-[72px]">
          {breadcrumb}
          {stickySuffix ? (
            <span
              ref={suffixRef}
              className="inline-flex items-center leading-none transition-opacity duration-150"
              style={{ opacity: 0 }}
            >
              {stickySuffix}
            </span>
          ) : null}
        </div>
      </div>

      <div
        ref={scrollRef}
        data-center-rail-scroll
        className="scrollbar-hidden h-full min-h-0 min-w-0 overflow-y-auto pb-10 pl-[72px]"
        style={{
          WebkitMaskImage: RAIL_STICKY_MASK_IMAGE,
          maskImage: RAIL_STICKY_MASK_IMAGE,
        }}
      >
        <div aria-hidden="true" className="h-[72px]" />
        <div aria-hidden="true" className="invisible">
          {breadcrumb}
        </div>
        <div className="pt-[30px]">
          {children}
        </div>
      </div>
    </div>
  );
}
