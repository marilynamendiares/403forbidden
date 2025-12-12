// src/components/ClearAllButton.tsx
"use client";

import { useState } from "react";
import { notifyUnread } from "@/lib/notifyUnread";

export function ClearAllButton() {
  const [loading, setLoading] = useState(false);

  const clearAll = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "clear-all" }),
      });
      if (res.ok) {
        // бейдж в хедере → 0
        notifyUnread({ op: "set", count: 0 });
        // чтобы скрылись индивидуальные кнопки на странице
        window.dispatchEvent(new CustomEvent("notifications:read_all"));
        // и просто перерисуем список (станет пустым)
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={clearAll}
      disabled={loading}
      className="rounded bg-red-500/10 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/20 disabled:opacity-50"
      title="Delete all notifications permanently"
    >
      {loading ? "Clearing…" : "Clear all"}
    </button>
  );
}
