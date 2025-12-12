// src/server/http.ts
export const ok = <T>(data: T, init?: ResponseInit) =>
  new Response(JSON.stringify(data), { ...init, headers: { "content-type": "application/json" }});
export const bad = (msg: string, code = 400) => ok({ error: msg }, { status: code });
