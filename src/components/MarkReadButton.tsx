"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { mutate as swrMutate } from "swr";

export function MarkReadButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await fetch("/api/notifications/mark-read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [id] }),
          });
          if (r.ok) {
            // мгновенно обновим счётчик колокольчика
            swrMutate("/api/notifications/count");
            // и сам список
            router.refresh();
          }
        })
      }
      className="text-sm px-2 py-1 rounded-lg border hover:bg-muted disabled:opacity-50"
    >
      {pending ? "Marking..." : "Mark read"}
    </button>
  );
}
