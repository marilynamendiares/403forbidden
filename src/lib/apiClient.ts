"use client";

type ApiErrorPayload = { error?: string; message?: string };

type FetchJsonOptions = RequestInit & {
  noStore?: boolean;
  includeCredentials?: boolean;
};

export type JsonResult<T> = {
  ok: boolean;
  status: number;
  payload: T & ApiErrorPayload;
};

export async function fetchJson<T>(path: string, options?: FetchJsonOptions): Promise<T> {
  const response = await fetch(path, {
    cache: options?.noStore === false ? undefined : "no-store",
    credentials: options?.includeCredentials ? "include" : options?.credentials,
    ...options,
  });

  const payload = (await response.json().catch(() => ({}))) as T & ApiErrorPayload;
  if (!response.ok) {
    throw new Error(payload?.error ?? payload?.message ?? `${response.status}`);
  }

  return payload;
}

export async function fetchJsonResult<T>(
  path: string,
  options?: FetchJsonOptions
): Promise<JsonResult<T>> {
  const response = await fetch(path, {
    cache: options?.noStore === false ? undefined : "no-store",
    credentials: options?.includeCredentials ? "include" : options?.credentials,
    ...options,
  });

  const payload = (await response.json().catch(() => ({}))) as T & ApiErrorPayload;

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

export async function fetchJsonOrNullOn401<T>(
  path: string,
  options?: FetchJsonOptions
): Promise<T | null> {
  const response = await fetch(path, {
    cache: options?.noStore === false ? undefined : "no-store",
    credentials: options?.includeCredentials ? "include" : options?.credentials,
    ...options,
  });

  if (response.status === 401) {
    return null;
  }

  const payload = (await response.json().catch(() => ({}))) as T & ApiErrorPayload;
  if (!response.ok) {
    throw new Error(payload?.error ?? payload?.message ?? `${response.status}`);
  }

  return payload;
}
