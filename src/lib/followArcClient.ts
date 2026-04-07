"use client";

import { fetchJson } from "@/lib/apiClient";

export type FollowArcResponse = {
  followed?: boolean;
  count?: number;
};

export function toggleArcFollow(slug: string) {
  return fetchJson<FollowArcResponse>(`/api/arcs/${slug}/follow`, {
    method: "POST",
    headers: { "content-type": "application/json" },
  });
}
