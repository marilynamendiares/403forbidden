type TimingEntry = {
  name: string;
  durationMs: number;
  description?: string;
};

function roundTimingMs(value: number) {
  return Math.max(0, Math.round(value * 10) / 10);
}

function sanitizeTimingToken(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function sanitizeTimingDescription(value: string) {
  return value.replace(/"/g, "'");
}

export class ServerTimingCollector {
  private readonly enabled: boolean;
  private readonly entries: TimingEntry[] = [];

  constructor(enabled = process.env.ENABLE_SERVER_TIMING === "1") {
    this.enabled = enabled;
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

  toHeaders(init?: HeadersInit) {
    if (!this.enabled || this.entries.length === 0) {
      return init;
    }

    const headers = new Headers(init);
    headers.set("Server-Timing", this.toHeaderValue());
    return headers;
  }

  private toHeaderValue() {
    return this.entries
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
  return new ServerTimingCollector();
}
