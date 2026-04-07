export const SHELL_TOPBAR_HEIGHT = 72;
export const SHELL_EDGE_GUTTER = 72;
export const SHELL_HISTORY_STRIP_WIDTH = 72;
export const SHELL_ARTBOARD_MAX_WIDTH = 1920;
export const SHELL_CENTER_WIDTH = 950;
export const SHELL_RAIL_MAX_WIDTH = 485;
export const SHELL_HOVER_NUDGE_TRIGGER_PX = 250;
export const SHELL_HOVER_NUDGE_TARGET_PX = 220;
export const SHELL_HOVER_NUDGE_MAX_PX = 120;

export function getShellArtboardWidth(viewportWidth: number) {
  return Math.min(viewportWidth, SHELL_ARTBOARD_MAX_WIDTH);
}

export function getShellLeftRailPx(viewportWidth: number) {
  const artboardWidth = getShellArtboardWidth(viewportWidth);
  return Math.max(
    0,
    Math.min(artboardWidth - SHELL_CENTER_WIDTH - SHELL_RAIL_MAX_WIDTH, SHELL_RAIL_MAX_WIDTH)
  );
}

export function getShellSidebarHoverNudgePx(leftRailPx: number) {
  if (leftRailPx >= SHELL_HOVER_NUDGE_TRIGGER_PX) {
    return 0;
  }

  return Math.min(
    SHELL_HOVER_NUDGE_MAX_PX,
    Math.max(0, SHELL_HOVER_NUDGE_TARGET_PX - leftRailPx)
  );
}

export const shellMetricVars = {
  topbarHeight: "var(--topbar-h)",
} as const;
