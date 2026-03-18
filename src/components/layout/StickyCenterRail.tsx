"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  breadcrumb: ReactNode;
  stickySuffix?: ReactNode;
  children: ReactNode;
};

export function StickyCenterRail({ breadcrumb, stickySuffix, children }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const breadcrumbRef = useRef<HTMLDivElement | null>(null);
  const suffixRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const scrollNode = scrollRef.current;
    const breadcrumbNode = breadcrumbRef.current;
    if (!scrollNode || !breadcrumbNode) return;
    const titleNode = scrollNode.querySelector<HTMLElement>("[data-sticky-title]");

    let raf = 0;

    const updateBreadcrumb = () => {
      raf = 0;
      const y = Math.max(0, 72 - scrollNode.scrollTop);
      breadcrumbNode.style.transform = `translateY(${y}px)`;

      if (suffixRef.current && titleNode) {
        const titleBottom = titleNode.getBoundingClientRect().bottom - scrollNode.getBoundingClientRect().top;
        const reveal = titleBottom <= 12;
        suffixRef.current.style.opacity = reveal ? "1" : "0";
      }
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(updateBreadcrumb);
    };

    updateBreadcrumb();
    scrollNode.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      scrollNode.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

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
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.06) 28px, rgba(0,0,0,0.18) 52px, rgba(0,0,0,0.48) 78px, rgba(0,0,0,0.82) 108px, #000 132px, #000 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.06) 28px, rgba(0,0,0,0.18) 52px, rgba(0,0,0,0.48) 78px, rgba(0,0,0,0.82) 108px, #000 132px, #000 100%)",
        }}
      >
        <div aria-hidden="true" className="h-[72px]" />
        <div aria-hidden="true" className="invisible">
          {breadcrumb}
        </div>
        <div className="pt-[30px]">{children}</div>
      </div>
    </div>
  );
}
