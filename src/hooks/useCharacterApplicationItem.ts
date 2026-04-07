"use client";

import useSWR from "swr";
import {
  fetchAdminCharacterApplication,
  fetchCharacterApplication,
  type AdminCharacterApplicationItem,
  type CharacterApplicationItem,
} from "@/lib/characterApplicationClient";

export function useCharacterApplicationItem(id: string) {
  const { data, error, isLoading, mutate } = useSWR<CharacterApplicationItem>(
    id ? `/api/characters/${id}` : null,
    () => fetchCharacterApplication(id),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      keepPreviousData: true,
    }
  );

  return {
    item: data ?? null,
    errorMessage: error instanceof Error ? error.message : null,
    isLoading,
    refresh: mutate,
  };
}

export function useAdminCharacterApplicationItem(id: string) {
  const { data, error, isLoading, mutate } = useSWR<AdminCharacterApplicationItem>(
    id ? `/api/admin/characters/${id}` : null,
    () => fetchAdminCharacterApplication(id),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      keepPreviousData: true,
    }
  );

  return {
    item: data ?? null,
    errorMessage: error instanceof Error ? error.message : null,
    isLoading,
    refresh: mutate,
  };
}
