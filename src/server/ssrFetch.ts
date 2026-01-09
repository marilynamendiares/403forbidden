import { headers } from "next/headers";

// IMPORTANT:
// Use this for all SSR -> API fetches that require auth.
// Plain fetch() does NOT forward cookies.

export async function ssrFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const h = await headers();

  return fetch(input, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init.headers || {}),
      cookie: h.get("cookie") ?? "",
    },
  });
}
