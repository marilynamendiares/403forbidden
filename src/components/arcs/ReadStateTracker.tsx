"use client";

import { useEffect } from "react";
import {
  getArcReadStatePayloadKey,
  markArcReadStateSent,
  postArcReadState,
  wasArcReadStateRecentlySent,
} from "@/lib/arcReadStateClient";

type Props = {
  arcId: string;
  lastChapterId?: string | null;
  lastPostId?: string | null;
  lastReadPostCreatedAt?: string | null;
};

export default function ReadStateTracker({
  arcId,
  lastChapterId = null,
  lastPostId = null,
  lastReadPostCreatedAt = null,
}: Props) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const minVisibleMs = lastChapterId ? 2500 : 4000;
    const dedupeWindowMs = 90_000;
    const payload = {
      arcId,
      lastChapterId,
      lastPostId,
      lastReadPostCreatedAt,
    };
    const payloadKey = getArcReadStatePayloadKey(payload);

    if (wasArcReadStateRecentlySent(arcId, payloadKey, dedupeWindowMs)) {
      return;
    }

    const controller = new AbortController();
    const startedAt = Date.now();
    let visibleStartedAt = document.visibilityState === "visible" ? Date.now() : null;
    let visibleAccumulatedMs = 0;
    let sent = false;

    const persist = () => {
      if (sent) return;
      sent = true;

      postArcReadState(payload, {
        signal: controller.signal,
        keepalive: true,
      })
        .then(() => {
          markArcReadStateSent(arcId, payloadKey);
        })
        .catch(() => {});
    };

    const getVisibleMs = () => {
      const currentVisible =
        visibleStartedAt === null ? 0 : Math.max(0, Date.now() - visibleStartedAt);
      return visibleAccumulatedMs + currentVisible;
    };

    const maybePersist = () => {
      if (Date.now() - startedAt < minVisibleMs) return;
      if (getVisibleMs() < minVisibleMs) return;
      persist();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        visibleStartedAt = Date.now();
        return;
      }

      if (visibleStartedAt !== null) {
        visibleAccumulatedMs += Math.max(0, Date.now() - visibleStartedAt);
        visibleStartedAt = null;
      }

      maybePersist();
    };

    const timeout = window.setTimeout(maybePersist, minVisibleMs + 250);

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", maybePersist);

    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", maybePersist);

      if (visibleStartedAt !== null) {
        visibleAccumulatedMs += Math.max(0, Date.now() - visibleStartedAt);
      }

      maybePersist();
      controller.abort();
    };
  }, [arcId, lastChapterId, lastPostId, lastReadPostCreatedAt]);

  return null;
}
