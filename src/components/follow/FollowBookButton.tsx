// src/components/follow/FollowBookButton.tsx
"use client";

import { useState } from "react";
import { Bell, BellRing } from "lucide-react";

type Props = {
  slug: string;
  initialFollowed: boolean;
  initialCount: number;
};

export function FollowBookButton({ slug, initialFollowed, initialCount }: Props) {
  const [followed, setFollowed] = useState(initialFollowed);
  const [count, setCount] = useState(initialCount);
  const [isPending, setIsPending] = useState(false);

  async function handleToggle() {
    if (isPending) return;
    setIsPending(true);

    try {
      const res = await fetch(`/api/books/${slug}/follow`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        console.error("Failed to toggle follow", res.status);
        return;
      }

      const json = (await res.json().catch(() => null)) as
        | { followed?: boolean; count?: number }
        | null;

      if (json && typeof json.followed === "boolean") {
        setFollowed(json.followed);
      }
      if (json && typeof json.count === "number") {
        setCount(json.count);
      }
    } catch (e) {
      console.error("Toggle follow error:", e);
    } finally {
      setIsPending(false);
    }
  }

  const isActive = followed;
  const countLabel = String(count ?? 0).padStart(2, "0");

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 text-xs text-[#666666] transition-colors hover:text-[#2D2D2D] disabled:opacity-50"
      title={isActive ? "Unfollow book" : "Follow book"}
    >
      <span className="inline-flex h-6 w-6 items-center justify-center text-neutral-500">
        {isActive ? (
          <BellRing className="h-4 w-4 text-[#4F6854]" fill="currentColor" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
      </span>

      <span className="header-font-archimoto tabular-nums text-[15px] font-thin leading-none text-[#666666]">
        {countLabel}
      </span>
    </button>
  );
}
