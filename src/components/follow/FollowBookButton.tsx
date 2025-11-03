"use client";
import { useState, useTransition } from "react";

export function FollowBookButton({
  slug,
  initialFollowed,
  initialCount,
}: {
  slug: string;
  initialFollowed: boolean;
  initialCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [followed, setFollowed] = useState(initialFollowed);
  const [count, setCount] = useState(initialCount);

  async function mutate(nextFollowed: boolean) {
    const method = nextFollowed ? "POST" : "DELETE";
    const res = await fetch(`/api/books/${slug}/follow`, { method, cache: "no-store" });
    if (!res.ok) return; // TODO: показать toast об ошибке
    const data = (await res.json()) as { followed: boolean; count: number };
    setFollowed(data.followed);
    setCount(data.count);
  }

  const onClick = () => {
    startTransition(() => mutate(!followed));
    // Оптимистичное обновление
    setFollowed(!followed);
    setCount((c) => c + (followed ? -1 : 1));
  };

  return (
    <button
      disabled={pending}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 border ${
        followed ? "bg-emerald-600 text-white" : "bg-transparent"
      }`}
      aria-pressed={followed}
      title={followed ? "Unfollow" : "Follow"}
    >
      {followed ? "Following" : "Follow"}
      <span className="text-xs opacity-80">{count}</span>
    </button>
  );
}
