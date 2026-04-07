"use client";

import { useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { toggleArcFollow } from "@/lib/followArcClient";

type Props = {
  slug: string;
  initialFollowed: boolean;
  initialCount: number;
};

export function FollowArcButton({ slug, initialFollowed, initialCount }: Props) {
  const [followed, setFollowed] = useState(initialFollowed);
  const [count, setCount] = useState(initialCount);
  const [isPending, setIsPending] = useState(false);

  async function handleToggle() {
    if (isPending) return;
    setIsPending(true);

    try {
      const json = await toggleArcFollow(slug);

      if (json && typeof json.followed === "boolean") {
        setFollowed(json.followed);
      }
      if (json && typeof json.count === "number") {
        setCount(json.count);
      }
    } catch (error) {
      console.error("Toggle follow error:", error);
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
      title={isActive ? "Unfollow arc" : "Follow arc"}
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
