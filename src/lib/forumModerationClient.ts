"use client";

import { fetchJsonResult } from "@/lib/apiClient";

type ReportPostResult = {
  ok?: boolean;
  alreadyReported?: boolean;
  error?: string;
};

export async function reportForumPost(postId: string) {
  return fetchJsonResult<ReportPostResult>(`/api/forum/posts/${encodeURIComponent(postId)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
}
