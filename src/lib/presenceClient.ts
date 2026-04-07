"use client";

import { fetchJson } from "@/lib/apiClient";

export type PresenceResponse = {
  ok: boolean;
  onlineUserIds: string[];
};

export function pingPresence() {
  return fetchJson<PresenceResponse>("/api/presence/ping", {
    method: "POST",
    includeCredentials: true,
  });
}
