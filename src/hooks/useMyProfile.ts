"use client";

import useSWR from "swr";
import { fetchJsonOrNullOn401 } from "@/lib/apiClient";

export type MyProfile = {
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  eurodollars: number;
  user: { id: string; email: string | null };
};

const fetchProfile = async (url: string): Promise<MyProfile | null> => {
  return fetchJsonOrNullOn401<MyProfile>(url, { includeCredentials: true });
};

export function useMyProfile(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<MyProfile | null>(
    enabled ? "/api/profile" : null,
    fetchProfile,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30_000,
    }
  );

  return {
    profile: data ?? null,
    error,
    isLoading,
    refresh: mutate,
  };
}
