"use client";

// The post becomes "active" slightly below the sticky breadcrumb zone,
// matching the visual reading line inside the center rail.
export const CENTER_RAIL_ACTIVE_POST_THRESHOLD_PX = 196;

// When jumping to a post from the chapter rail, keep it tucked under
// the sticky breadcrumb/title region instead of flush against the top.
export const CENTER_RAIL_SCROLL_TARGET_OFFSET_PX = 148;

export function getCenterRailScrollRoot() {
  return document.querySelector<HTMLElement>("[data-center-rail-scroll]");
}
