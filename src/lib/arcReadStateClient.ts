"use client";

import { readSessionStorage, writeSessionStorage } from "@/lib/browserStorage";

export type ArcReadStatePayload = {
  arcId: string;
  lastChapterId?: string | null;
  lastPostId?: string | null;
  lastReadPostCreatedAt?: string | null;
};

type ArcReadStateDedupeRecord = {
  payloadKey?: string;
  sentAt?: number;
};

export function getArcReadStateSessionKey(arcId: string) {
  return `arcs:read-state:${arcId}`;
}

export function getArcReadStatePayloadKey(payload: ArcReadStatePayload) {
  return JSON.stringify(payload);
}

export function wasArcReadStateRecentlySent(
  arcId: string,
  payloadKey: string,
  dedupeWindowMs: number
) {
  const raw = readSessionStorage(getArcReadStateSessionKey(arcId));
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw) as ArcReadStateDedupeRecord | null;
    return (
      parsed?.payloadKey === payloadKey &&
      typeof parsed.sentAt === "number" &&
      Date.now() - parsed.sentAt < dedupeWindowMs
    );
  } catch {
    return false;
  }
}

export function markArcReadStateSent(arcId: string, payloadKey: string) {
  writeSessionStorage(
    getArcReadStateSessionKey(arcId),
    JSON.stringify({
      payloadKey,
      sentAt: Date.now(),
    } satisfies ArcReadStateDedupeRecord)
  );
}

export async function postArcReadState(
  payload: ArcReadStatePayload,
  options?: { signal?: AbortSignal; keepalive?: boolean }
) {
  return fetch("/api/arcs/read-state", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: options?.signal,
    keepalive: options?.keepalive,
  });
}
