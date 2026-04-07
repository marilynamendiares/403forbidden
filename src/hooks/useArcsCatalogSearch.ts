"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  type ArcPagePayload,
  type CatalogState,
} from "@/components/arcs/arcsDiscoveryUi";
import { fetchArcsCatalog, fetchArcsSearch } from "@/lib/arcsCatalogClient";

type Options = {
  state: CatalogState;
  deferredQuery: string;
  initialCatalog: ArcPagePayload;
};

export function useArcsCatalogSearch({ state, deferredQuery, initialCatalog }: Options) {
  const [catalog, setCatalog] = useState<ArcPagePayload>(initialCatalog);
  const [searchResults, setSearchResults] = useState<ArcPagePayload | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const activeRequestIdRef = useRef(0);
  const activeAbortControllerRef = useRef<AbortController | null>(null);

  const requestState = useMemo(
    () => ({
      ...state,
      q: deferredQuery,
    }),
    [deferredQuery, state]
  );

  const hasSearch = deferredQuery.trim().length > 0;

  useEffect(() => {
    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;

    activeAbortControllerRef.current?.abort();
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;

    const isLatestRequest = () => activeRequestIdRef.current === requestId;

    if (hasSearch) {
      setLoadingSearch(true);
      startTransition(() => {
        fetchArcsSearch(requestState, { signal: controller.signal })
          .then((payload: ArcPagePayload) => {
            if (!isLatestRequest()) return;
            setSearchResults(payload);
          })
          .catch((error: unknown) => {
            if ((error as { name?: string } | null)?.name === "AbortError") return;
            if (!isLatestRequest()) return;
            setSearchResults({ items: [], nextCursor: null });
          })
          .finally(() => {
            if (!isLatestRequest()) return;
            setLoadingSearch(false);
          });
      });
      return () => {
        controller.abort();
      };
    }

    setSearchResults(null);
    setLoadingCatalog(true);
    startTransition(() => {
      fetchArcsCatalog(requestState, undefined, { signal: controller.signal })
        .then((payload: ArcPagePayload) => {
          if (!isLatestRequest()) return;
          setCatalog(payload);
        })
        .catch((error: unknown) => {
          if ((error as { name?: string } | null)?.name === "AbortError") return;
          if (!isLatestRequest()) return;
          setCatalog({ items: [], nextCursor: null });
        })
        .finally(() => {
          if (!isLatestRequest()) return;
          setLoadingCatalog(false);
        });
    });

    return () => {
      controller.abort();
    };
  }, [hasSearch, requestState]);

  async function loadMoreCatalog() {
    if (!catalog.nextCursor || loadingCatalog) return;
    setLoadingCatalog(true);

    try {
      const payload = await fetchArcsCatalog(state, catalog.nextCursor);
      setCatalog((prev) => ({
        items: [...prev.items, ...payload.items],
        nextCursor: payload.nextCursor,
      }));
    } finally {
      setLoadingCatalog(false);
    }
  }

  function resetCatalogState() {
    setCatalog(initialCatalog);
    setSearchResults(null);
  }

  return {
    catalog,
    searchResults,
    loadingCatalog,
    loadingSearch,
    hasSearch,
    loadMoreCatalog,
    resetCatalogState,
  };
}
