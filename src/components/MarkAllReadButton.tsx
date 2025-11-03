"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { mutate as swrMutate } from "swr";

export function MarkAllReadButton() {
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
            body: JSON.stringify({ all: true }),
          });
          if (r.ok) {
            swrMutate("/api/notifications/count"); // обновим колокольчик
            router.refresh();                       // и список
          }
        })
      }
      className="text-sm px-3 py-1.5 rounded-lg border hover:bg-muted disabled:opacity-50"
    >
      {pending ? "Marking..." : "Mark all read"}
    </button>
  );
}
