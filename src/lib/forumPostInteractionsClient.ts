"use client";

import { fetchJson } from "@/lib/apiClient";

type ForumLikeResponse = {
  likesCount?: number;
  liked?: boolean;
};

type ForumReputationResponse = {
  repCount?: number;
};

export async function toggleForumPostLike(input: {
  postId: string;
  nextLiked: boolean;
}) {
  return fetchJson<ForumLikeResponse>(
    `/api/forum/posts/${encodeURIComponent(input.postId)}/like`,
    {
      method: input.nextLiked ? "POST" : "DELETE",
      includeCredentials: true,
    }
  );
}

export async function grantForumPostReputation(input: {
  postId: string;
  amount: number;
}) {
  return fetchJson<ForumReputationResponse>(
    `/api/forum/posts/${encodeURIComponent(input.postId)}/reputation`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: input.amount }),
      includeCredentials: true,
    }
  );
}
