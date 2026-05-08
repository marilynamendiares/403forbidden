import { AsyncLocalStorage } from "node:async_hooks";

type TimingEntry = {
  name: string;
  durationMs: number;
  description?: string;
};

type ObservedQueryEvent = {
  query?: string;
  label?: string;
  durationMs: number;
  target?: string;
};

type QuerySummary = {
  count: number;
  totalDurationMs: number;
  slowest?: {
    label: string;
    durationMs: number;
    target?: string;
  };
};

declare global {
  // eslint-disable-next-line no-var
  var __serverTimingStorage: AsyncLocalStorage<ServerTimingCollector> | undefined;
}

const observabilityStorage =
  global.__serverTimingStorage ?? new AsyncLocalStorage<ServerTimingCollector>();

if (!global.__serverTimingStorage) {
  global.__serverTimingStorage = observabilityStorage;
}

function roundTimingMs(value: number) {
  return Math.max(0, Math.round(value * 10) / 10);
}

function readThresholdFromEnv(name: string, fallback: number) {
  const raw = Number(process.env[name] ?? "");
  return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
}

function sanitizeTimingToken(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function sanitizeTimingDescription(value: string) {
  return value.replace(/"/g, "'");
}

function sanitizeHeaderToken(value: string) {
  return value.replace(/[^\w.-]/g, "_");
}

function summarizeQueryShape(query: string) {
  const compact = query.replace(/\s+/g, " ").trim();
  const operationMatch = compact.match(/^(select|insert|update|delete)\b/i);
  const operation = operationMatch?.[1]?.toUpperCase() ?? "QUERY";

  const tableMatch =
    compact.match(/\bfrom\s+"([^"]+)"/i) ??
    compact.match(/\binto\s+"([^"]+)"/i) ??
    compact.match(/\bupdate\s+"([^"]+)"/i) ??
    compact.match(/\bjoin\s+"([^"]+)"/i);

  const table = tableMatch?.[1] ?? "unknown";
  return `${operation} ${table}`;
}

function summarizeObservedQuery(event: ObservedQueryEvent) {
  if (event.label && event.label.trim().length > 0) {
    return event.label.trim();
  }
  if (event.query && event.query.trim().length > 0) {
    return summarizeQueryShape(event.query);
  }
  return "QUERY unknown";
}

function cloneResponseWithHeaders(response: Response, headers: HeadersInit) {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export class ServerTimingCollector {
  private readonly enabled: boolean;
  private readonly entries: TimingEntry[] = [];
  private readonly slowRequestMs: number;
  private readonly slowQueryMs: number;
  private queryCount = 0;
  private queryTotalDurationMs = 0;
  private slowestQuery:
    | {
        label: string;
        durationMs: number;
        target?: string;
      }
    | undefined;

  constructor(enabled = process.env.ENABLE_SERVER_TIMING === "1") {
    this.enabled = enabled;
    this.slowRequestMs = readThresholdFromEnv("OBSERVABILITY_SLOW_REQUEST_MS", 800);
    this.slowQueryMs = readThresholdFromEnv("OBSERVABILITY_SLOW_QUERY_MS", 150);
  }

  async measure<T>(name: string, task: () => Promise<T>, description?: string) {
    if (!this.enabled) {
      return task();
    }

    const startedAt = performance.now();
    try {
      return await task();
    } finally {
      this.entries.push({
        name,
        durationMs: roundTimingMs(performance.now() - startedAt),
        description,
      });
    }
  }

  run<T>(task: () => Promise<T>) {
    return observabilityStorage.run(this, task);
  }

  recordQuery(event: ObservedQueryEvent) {
    if (!this.enabled) {
      return;
    }

    const durationMs = roundTimingMs(event.durationMs);
    const label = summarizeObservedQuery(event);

    this.queryCount += 1;
    this.queryTotalDurationMs = roundTimingMs(this.queryTotalDurationMs + durationMs);

    if (!this.slowestQuery || durationMs >= this.slowestQuery.durationMs) {
      this.slowestQuery = {
        label,
        durationMs,
        target: event.target,
      };
    }
  }

  getQuerySummary(): QuerySummary | null {
    if (!this.enabled || this.queryCount === 0) {
      return null;
    }

    return {
      count: this.queryCount,
      totalDurationMs: this.queryTotalDurationMs,
      slowest: this.slowestQuery,
    };
  }

  toHeaders(init?: HeadersInit) {
    const querySummary = this.getQuerySummary();
    if (!this.enabled || (this.entries.length === 0 && !querySummary)) {
      return init;
    }

    const headers = new Headers(init);
    headers.set("Server-Timing", this.toHeaderValue(querySummary));

    if (querySummary) {
      headers.set("X-Observability-Query-Count", String(querySummary.count));
      headers.set("X-Observability-Query-Time-Ms", String(querySummary.totalDurationMs));

      if (querySummary.slowest) {
        headers.set(
          "X-Observability-Slowest-Query",
          sanitizeHeaderToken(querySummary.slowest.label)
        );
        headers.set(
          "X-Observability-Slowest-Query-Ms",
          String(querySummary.slowest.durationMs)
        );
      }
    }

    return headers;
  }

  flushIfSlow(status: number) {
    if (!this.enabled) {
      return;
    }

    const requestTotal =
      this.entries.find((entry) => entry.name === "request_total")?.durationMs ?? 0;
    const slowRequest = requestTotal >= this.slowRequestMs;
    const slowQuery = (this.slowestQuery?.durationMs ?? 0) >= this.slowQueryMs;

    if (!slowRequest && !slowQuery && status < 500) {
      return;
    }

    console.warn(
      JSON.stringify({
        kind: "request_observability",
        status,
        requestTotalMs: requestTotal,
        queryCount: this.queryCount,
        queryTotalMs: this.queryTotalDurationMs,
        slowestQuery: this.slowestQuery ?? null,
      })
    );
  }

  private toHeaderValue(querySummary: QuerySummary | null) {
    const entries = [...this.entries];
    if (querySummary) {
      entries.push({
        name: "db",
        durationMs: querySummary.totalDurationMs,
        description: `prisma queries (${querySummary.count})`,
      });
    }

    return entries
      .map((entry) => {
        const name = sanitizeTimingToken(entry.name);
        const base = `${name};dur=${entry.durationMs}`;
        if (!entry.description) return base;
        return `${base};desc="${sanitizeTimingDescription(entry.description)}"`;
      })
      .join(", ");
  }
}

export function createServerTimingCollector() {
  return getActiveServerTimingCollector() ?? new ServerTimingCollector();
}

export function getActiveServerTimingCollector() {
  return observabilityStorage.getStore();
}

export function recordObservedQuery(event: ObservedQueryEvent) {
  getActiveServerTimingCollector()?.recordQuery(event);
}

export async function withRouteObservability(
  handler: (timing: ServerTimingCollector) => Promise<Response>
) {
  const collector = new ServerTimingCollector();

  return collector.run(async () => {
    try {
      const response = await collector.measure("request_total", () => handler(collector), "full request");
      const instrumented = cloneResponseWithHeaders(
        response,
        collector.toHeaders(response.headers) ?? response.headers
      );
      collector.flushIfSlow(instrumented.status);
      return instrumented;
    } catch (error) {
      collector.flushIfSlow(500);
      throw error;
    }
  });
}
