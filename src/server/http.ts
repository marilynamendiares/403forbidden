// src/server/http.ts
type JsonHeaders = Record<string, string>;

function withJsonHeaders(headers?: HeadersInit): JsonHeaders {
  const base: JsonHeaders =
    headers instanceof Headers
      ? Object.fromEntries(headers.entries())
      : Array.isArray(headers)
        ? Object.fromEntries(headers)
        : { ...(headers ?? {}) };

  return {
    "content-type": "application/json",
    ...base,
  };
}

export const json = <T>(data: T, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: withJsonHeaders(init?.headers),
  });

export const ok = <T>(data: T, init?: ResponseInit) => json(data, init);

export const error = (message: string, status = 400, init?: ResponseInit) =>
  json({ error: message }, { ...init, status });

export const bad = (msg: string, code = 400) => error(msg, code);

export const noContent = (init?: ResponseInit) =>
  new Response(null, { ...init, status: init?.status ?? 204 });
