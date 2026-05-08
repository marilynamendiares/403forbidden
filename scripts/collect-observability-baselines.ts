type TimingMetric = {
  name: string;
  durationMs: number;
  description?: string;
};

type Measurement = {
  status: number;
  requestTotalMs: number | null;
  dbTotalMs: number | null;
  queryCount: number | null;
  queryTimeMs: number | null;
  slowestQuery: string | null;
  slowestQueryMs: number | null;
  timings: TimingMetric[];
};

type ScenarioConfig = {
  id: string;
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  requiresAuth?: boolean;
  enabled?: boolean;
  notes?: string;
};

type ScenarioResult = {
  scenario: ScenarioConfig;
  measurements: Measurement[];
};

const BASE_URL = process.env.BASELINE_BASE_URL ?? "http://localhost:3000";
const SAMPLE_COUNT = clampPositiveInt(process.env.BASELINE_SAMPLE_COUNT, 3);
const OUTPUT_PATH = process.env.BASELINE_OUTPUT_PATH ?? "";
const COOKIE_HEADER = process.env.BASELINE_COOKIE ?? "";
const ENABLE_SERVER_TIMING = process.env.ENABLE_SERVER_TIMING;

function clampPositiveInt(value: string | undefined, fallback: number) {
  const num = Number(value ?? "");
  return Number.isInteger(num) && num > 0 ? num : fallback;
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function parseServerTiming(value: string | null) {
  if (!value) return [] as TimingMetric[];

  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const segments = part.split(";").map((segment) => segment.trim());
      const name = segments[0] ?? "unknown";
      const durSegment = segments.find((segment) => segment.startsWith("dur="));
      const descSegment = segments.find((segment) => segment.startsWith("desc="));
      const durationMs = Number(durSegment?.slice(4) ?? "0");
      const description = descSegment?.slice(5).replace(/^"|"$/g, "");

      return {
        name,
        durationMs: Number.isFinite(durationMs) ? durationMs : 0,
        description: description || undefined,
      };
    });
}

function round(value: number | null) {
  if (value === null) return null;
  return Math.round(value * 10) / 10;
}

function average(values: Array<number | null>) {
  const nums = values.filter((value): value is number => value !== null);
  if (nums.length === 0) return null;
  return round(nums.reduce((sum, value) => sum + value, 0) / nums.length);
}

function max(values: Array<number | null>) {
  const nums = values.filter((value): value is number => value !== null);
  if (nums.length === 0) return null;
  return round(Math.max(...nums));
}

function formatMs(value: number | null) {
  return value === null ? "n/a" : `${value.toFixed(1)}ms`;
}

function formatCount(value: number | null) {
  return value === null ? "n/a" : String(value);
}

function getTimingValue(timings: TimingMetric[], name: string) {
  return timings.find((timing) => timing.name === name)?.durationMs ?? null;
}

function getScenarios() {
  const forumCategory = requiredEnv("BASELINE_FORUM_CATEGORY");
  const forumThreadSlug = requiredEnv("BASELINE_FORUM_THREAD_SLUG");
  const arcSlug = requiredEnv("BASELINE_ARC_SLUG");
  const chapterId = requiredEnv("BASELINE_CHAPTER_ID");
  const chapterIndex = requiredEnv("BASELINE_CHAPTER_INDEX");

  const forumPath =
    forumCategory && forumThreadSlug
      ? `/api/forum/categories/${forumCategory}/threads/${forumThreadSlug}/posts`
      : null;

  const legacyChapterPath =
    arcSlug && chapterIndex ? `/api/arcs/${arcSlug}/${chapterIndex}/posts` : null;

  const chapterByIdPath =
    arcSlug && chapterId ? `/api/arcs/${arcSlug}/chapters/${chapterId}/posts` : null;

  const discoveryPath = "/api/arcs/discovery";
  const presencePath = "/api/presence/ping";
  const notificationsCountPath = "/api/notifications/count";

  return [
    {
      id: "forum_thread_read",
      method: "GET",
      path: forumPath ?? "",
      enabled: Boolean(forumPath),
      notes: "Primary forum thread slice baseline.",
    },
    {
      id: "forum_thread_reply",
      method: "POST",
      path: forumPath ?? "",
      enabled: Boolean(forumPath),
      requiresAuth: true,
      body: {
        content:
          process.env.BASELINE_FORUM_REPLY_CONTENT ??
          `Observability baseline reply ${new Date().toISOString()}`,
      },
      notes: "Reply create path. Use only against disposable local data.",
    },
    {
      id: "chapter_posts_read",
      method: "GET",
      path: chapterByIdPath ?? legacyChapterPath ?? "",
      enabled: Boolean(chapterByIdPath ?? legacyChapterPath),
      notes: "Primary writer post-slice baseline.",
    },
    {
      id: "chapter_post_create",
      method: "POST",
      path: chapterByIdPath ?? legacyChapterPath ?? "",
      enabled: Boolean(chapterByIdPath ?? legacyChapterPath),
      requiresAuth: true,
      body: {
        contentMd:
          process.env.BASELINE_CHAPTER_POST_CONTENT ??
          `Observability baseline chapter post ${new Date().toISOString()}`,
      },
      notes: "Writer create path. Use only against disposable local data.",
    },
    {
      id: "arcs_discovery",
      method: "GET",
      path: discoveryPath,
      enabled: true,
      notes: "Archive/discovery compose baseline.",
    },
    {
      id: "presence_ping",
      method: "POST",
      path: presencePath,
      enabled: true,
      requiresAuth: true,
      notes: "Incidental traffic heartbeat baseline.",
    },
    {
      id: "notifications_count",
      method: "GET",
      path: notificationsCountPath,
      enabled: true,
      notes: "Unread badge background cost baseline.",
    },
  ] satisfies ScenarioConfig[];
}

async function runScenario(scenario: ScenarioConfig): Promise<ScenarioResult | null> {
  if (!scenario.enabled || !scenario.path) {
    return null;
  }

  if (scenario.requiresAuth && !COOKIE_HEADER) {
    console.log(`Skipping ${scenario.id}: BASELINE_COOKIE is required.`);
    return null;
  }

  const measurements: Measurement[] = [];

  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const headers = new Headers();
    if (scenario.body !== undefined) {
      headers.set("content-type", "application/json");
    }
    if (COOKIE_HEADER) {
      headers.set("cookie", COOKIE_HEADER);
    }

    const response = await fetch(new URL(scenario.path, BASE_URL), {
      method: scenario.method,
      headers,
      body: scenario.body !== undefined ? JSON.stringify(scenario.body) : undefined,
    });

    const serverTiming = parseServerTiming(response.headers.get("server-timing"));
    measurements.push({
      status: response.status,
      requestTotalMs: getTimingValue(serverTiming, "request_total"),
      dbTotalMs: getTimingValue(serverTiming, "db"),
      queryCount: Number(response.headers.get("x-observability-query-count") ?? ""),
      queryTimeMs: Number(response.headers.get("x-observability-query-time-ms") ?? ""),
      slowestQuery: response.headers.get("x-observability-slowest-query"),
      slowestQueryMs: Number(response.headers.get("x-observability-slowest-query-ms") ?? ""),
      timings: serverTiming,
    });
  }

  return { scenario, measurements };
}

function normalizeNullableNumber(value: number) {
  return Number.isFinite(value) ? value : null;
}

function summarizeResults(results: ScenarioResult[]) {
  return results.map(({ scenario, measurements }) => {
    const statuses = Array.from(new Set(measurements.map((item) => item.status))).join(", ");

    const avgRequest = average(measurements.map((item) => item.requestTotalMs));
    const maxRequest = max(measurements.map((item) => item.requestTotalMs));
    const avgDb = average(measurements.map((item) => item.dbTotalMs));
    const avgQueryCount = average(
      measurements.map((item) => normalizeNullableNumber(item.queryCount ?? Number.NaN))
    );
    const avgQueryTime = average(
      measurements.map((item) => normalizeNullableNumber(item.queryTimeMs ?? Number.NaN))
    );

    const slowestEntry = measurements
      .filter((item) => item.slowestQuery && item.slowestQueryMs !== null)
      .sort((left, right) => (right.slowestQueryMs ?? 0) - (left.slowestQueryMs ?? 0))[0];

    const requestTimingNames = Array.from(
      new Set(measurements.flatMap((item) => item.timings.map((timing) => timing.name)))
    );

    return {
      scenario,
      statuses,
      avgRequest,
      maxRequest,
      avgDb,
      avgQueryCount,
      avgQueryTime,
      slowestQuery: slowestEntry?.slowestQuery ?? null,
      slowestQueryMs: slowestEntry?.slowestQueryMs ?? null,
      requestTimingNames,
    };
  });
}

function renderMarkdown(results: ScenarioResult[]) {
  const lines: string[] = [];
  const summaries = summarizeResults(results);

  lines.push("# Observability Baseline Capture");
  lines.push("");
  lines.push(`- Date: ${new Date().toISOString()}`);
  lines.push(`- Base URL: ${BASE_URL}`);
  lines.push(`- Samples per scenario: ${SAMPLE_COUNT}`);
  lines.push(`- ENABLE_SERVER_TIMING: ${ENABLE_SERVER_TIMING ?? "unset"}`);
  lines.push("");

  for (const summary of summaries) {
    lines.push(`## ${summary.scenario.id}`);
    lines.push("");
    lines.push(`- Method/Path: \`${summary.scenario.method} ${summary.scenario.path}\``);
    lines.push(`- Statuses: ${summary.statuses}`);
    if (summary.scenario.notes) {
      lines.push(`- Notes: ${summary.scenario.notes}`);
    }
    lines.push(`- Avg request total: ${formatMs(summary.avgRequest)}`);
    lines.push(`- Max request total: ${formatMs(summary.maxRequest)}`);
    lines.push(`- Avg DB total: ${formatMs(summary.avgDb)}`);
    lines.push(`- Avg query count: ${formatCount(summary.avgQueryCount)}`);
    lines.push(`- Avg query time: ${formatMs(summary.avgQueryTime)}`);
    lines.push(
      `- Slowest query: ${
        summary.slowestQuery ? `\`${summary.slowestQuery}\` (${formatMs(summary.slowestQueryMs)})` : "n/a"
      }`
    );
    lines.push(
      `- Timing stages seen: ${summary.requestTimingNames.length > 0 ? summary.requestTimingNames.map((name) => `\`${name}\``).join(", ") : "n/a"}`
    );
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const scenarios = getScenarios();
  const results: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    const result = await runScenario(scenario);
    if (result) {
      results.push(result);
    }
  }

  if (results.length === 0) {
    console.error("No baseline scenarios were executed. Check env configuration.");
    process.exitCode = 1;
    return;
  }

  const markdown = renderMarkdown(results);
  console.log(markdown);

  if (OUTPUT_PATH) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(OUTPUT_PATH, markdown, "utf8");
    console.log(`Saved baseline report to ${OUTPUT_PATH}`);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
