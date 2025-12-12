// src/components/MarkReadButton.tsx
"use client";

import { useEffect, useState } from "react";
import { notifyUnread } from "@/lib/notifyUnread";

export function MarkReadButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onAll = () => setDone(true);
    window.addEventListener("notifications:read_all", onAll);
    return () => window.removeEventListener("notifications:read_all", onAll);
  }, []);

  const markOne = async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "mark-one", id }),
      });
      if (res.ok) {
        const { unread } = await res.json().catch(() => ({ unread: undefined }));
        if (typeof unread === "number") notifyUnread({ op: "set", count: unread });
        setDone(true); // скрываем кнопку сразу
      }
    } finally {
      setLoading(false);
    }
  };

  if (done) return null;

  return (
    <button
      onClick={markOne}
      disabled={loading}
      className="rounded border border-neutral-700 px-3 py-1.5 text-xs hover:bg-white/10 disabled:opacity-50"
      title="Mark as read"
    >
      {loading ? "Marking…" : "Mark read"}
    </button>
  );
}
