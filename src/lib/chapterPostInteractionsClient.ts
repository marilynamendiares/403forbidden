"use client";

import { fetchJson } from "@/lib/apiClient";

type PostMutationResponse = {
  post?: {
    contentMd: string;
    editedAt?: string | null;
  };
};

type LikeResponse = {
  likesCount?: number;
  liked?: boolean;
};

type ReputationResponse = {
  repCount?: number;
};

export async function updateChapterPost(input: {
  slug: string;
  index: number | string;
  postId: string;
  contentMd: string;
}) {
  return fetchJson<PostMutationResponse>(
    `/api/arcs/${input.slug}/${input.index}/posts/${input.postId}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contentMd: input.contentMd }),
      includeCredentials: true,
    }
  );
}

export async function deleteChapterPost(input: {
  slug: string;
  index: number | string;
  postId: string;
}) {
  await fetchJson<unknown>(
    `/api/arcs/${input.slug}/${input.index}/posts/${input.postId}`,
    {
      method: "DELETE",
      includeCredentials: true,
    }
  );
}

export async function toggleChapterPostLike(input: {
  slug: string;
  index: number | string;
  postId: string;
  nextLiked: boolean;
}) {
  return fetchJson<LikeResponse>(
    `/api/arcs/${input.slug}/${input.index}/posts/${input.postId}/like`,
    {
      method: input.nextLiked ? "POST" : "DELETE",
      includeCredentials: true,
    }
  );
}

export async function grantChapterPostReputation(input: {
  slug: string;
  index: number | string;
  postId: string;
  amount: number;
}) {
  return fetchJson<ReputationResponse>(
    `/api/arcs/${input.slug}/${input.index}/posts/${input.postId}/reputation`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: input.amount }),
      includeCredentials: true,
    }
  );
}
