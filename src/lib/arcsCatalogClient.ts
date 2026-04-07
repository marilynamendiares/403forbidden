"use client";

import { fetchJson } from "@/lib/apiClient";
import type { ArcPagePayload, CatalogState } from "@/components/arcs/arcsDiscoveryUi";
import { buildCatalogUrl, buildSearchUrl } from "@/components/arcs/arcsDiscoveryUi";

type ArcsCatalogClientOptions = {
  signal?: AbortSignal;
};

export function fetchArcsCatalog(
  state: CatalogState,
  cursor?: string | null,
  options?: ArcsCatalogClientOptions
) {
  return fetchJson<ArcPagePayload>(buildCatalogUrl(state, cursor), {
    signal: options?.signal,
  });
}

export function fetchArcsSearch(
  state: CatalogState & { q: string },
  options?: ArcsCatalogClientOptions
) {
  return fetchJson<ArcPagePayload>(buildSearchUrl(state), {
    signal: options?.signal,
  });
}
