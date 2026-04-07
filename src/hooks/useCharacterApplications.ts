"use client";

import useSWR from "swr";
import { fetchJson } from "@/lib/apiClient";
import type { CharacterApplicationStatus } from "@/lib/characterApplication";

export type CharacterApplicationListItem = {
  id: string;
  name: string;
  status: CharacterApplicationStatus;
  updatedAt: string;
  createdAt: string;
  lastSubmittedAt: string | null;
  moderatorNote?: string | null;
};

export type AdminCharacterApplicationRow = {
  id: string;
  name: string;
  status: CharacterApplicationStatus;
  updatedAt: string;
  createdAt?: string;
  lastSubmittedAt: string | null;
  moderatorNote?: string | null;
  moderatorId?: string | null;
  user: {
    id: string;
    email: string;
    username: string;
    profile: { displayName: string; avatarUrl: string | null } | null;
  };
};

type CharacterApplicationsResponse = {
  items?: CharacterApplicationListItem[];
  error?: string;
};

type AdminCharacterApplicationsResponse = {
  items?: AdminCharacterApplicationRow[];
  groups?: {
    inReview: AdminCharacterApplicationRow[];
    other: AdminCharacterApplicationRow[];
  };
  error?: string;
};

export function sortCharacterApplications(
  items: CharacterApplicationListItem[]
): CharacterApplicationListItem[] {
  const priority: Record<CharacterApplicationStatus, number> = {
    NEEDS_CHANGES: 0,
    DRAFT: 1,
    SUBMITTED: 2,
    UNDER_REVIEW: 3,
    APPROVED: 4,
  };

  return [...items].sort((a, b) => {
    const diff = priority[a.status] - priority[b.status];
    if (diff !== 0) {
      return diff;
    }

    return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
  });
}

export function useCharacterApplications() {
  const { data, error, isLoading, mutate } = useSWR<CharacterApplicationsResponse>(
    "/api/characters",
    (url: string) => fetchJson<CharacterApplicationsResponse>(url, { includeCredentials: true }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      keepPreviousData: true,
    }
  );

  return {
    items: sortCharacterApplications(data?.items ?? []),
    errorMessage: error instanceof Error ? error.message : null,
    isLoading,
    refresh: mutate,
  };
}

export function useAdminCharacterApplications() {
  const { data, error, isLoading, mutate } = useSWR<AdminCharacterApplicationsResponse>(
    "/api/admin/characters",
    (url: string) => fetchJson<AdminCharacterApplicationsResponse>(url, { includeCredentials: true }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      keepPreviousData: true,
    }
  );

  return {
    items: data?.items ?? [],
    groups: data?.groups ?? null,
    errorMessage: error instanceof Error ? error.message : null,
    isLoading,
    refresh: mutate,
  };
}
