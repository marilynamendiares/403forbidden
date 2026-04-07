import type { ArcCardRow } from "@/server/arcs/arcSelects";

export const HOT_ACTIVITY_DAYS = 3;
export const WARM_ACTIVITY_DAYS = 21;
export const DEAD_ACTIVITY_DAYS = 45;
export const HOT_HEAT_SCORE = 18;
export const WARM_HEAT_MIN = 2;

type ArcMetricsLike = NonNullable<ArcCardRow["metrics"]> | null | undefined;

function daysSince(date: Date | null | undefined) {
  if (!date) return Number.POSITIVE_INFINITY;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function metricDefaults(metrics: ArcMetricsLike) {
  return {
    postsTotal: metrics?.postsTotal ?? 0,
    followersCount: metrics?.followersCount ?? 0,
    heatScore: metrics?.heatScore ?? 0,
    lastActivityAt: metrics?.lastActivityAt ?? null,
    posts7d: metrics?.posts7d ?? 0,
    likes7d: metrics?.likes7d ?? 0,
    rep7d: metrics?.rep7d ?? 0,
  };
}

export function inferArcActivityBucket(metrics: ArcMetricsLike) {
  const resolved = metricDefaults(metrics);
  const inactiveDays = daysSince(resolved.lastActivityAt);

  if (!resolved.lastActivityAt || inactiveDays > DEAD_ACTIVITY_DAYS) return "dead" as const;

  const recentPressure =
    resolved.posts7d >= 2 || resolved.likes7d >= 2 || resolved.rep7d >= 1;

  if (
    inactiveDays <= HOT_ACTIVITY_DAYS &&
    (resolved.heatScore >= HOT_HEAT_SCORE || recentPressure)
  ) {
    return "hot" as const;
  }

  if (inactiveDays <= WARM_ACTIVITY_DAYS || resolved.heatScore >= WARM_HEAT_MIN) {
    return "warm" as const;
  }

  return "dead" as const;
}

export function computeTrendingDiscoveryScore(arc: ArcCardRow) {
  const metrics = metricDefaults(arc.metrics);
  const inactiveDays = daysSince(metrics.lastActivityAt);
  const freshness = clamp(20 - inactiveDays * 2.5, 0, 20);
  const participation = clamp(metrics.followersCount * 0.8, 0, 10);

  return (
    metrics.posts7d * 8 +
    metrics.likes7d * 5 +
    metrics.rep7d * 4 +
    metrics.heatScore * 1.5 +
    participation +
    freshness
  );
}

export function computeRecentDiscoveryScore(arc: ArcCardRow) {
  const metrics = metricDefaults(arc.metrics);
  const inactiveDays = daysSince(metrics.lastActivityAt);
  const freshness = clamp(30 - inactiveDays * 4, 0, 30);

  return freshness + metrics.posts7d * 3 + metrics.likes7d * 2 + metrics.heatScore * 0.5;
}

export function computeNewDiscoveryScore(arc: ArcCardRow) {
  const metrics = metricDefaults(arc.metrics);
  const ageDays = daysSince(arc.createdAt);
  const youth = clamp(20 - ageDays * 1.5, 0, 20);
  const starterWindow = metrics.postsTotal <= 3 ? 18 : metrics.postsTotal <= 5 ? 8 : 0;

  return youth + starterWindow + metrics.posts7d * 2 + metrics.likes7d + metrics.rep7d;
}
