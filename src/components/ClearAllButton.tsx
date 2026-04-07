// src/components/ClearAllButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearAllNotifications } from "@/lib/notificationActions";

export function ClearAllButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const clearAll = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await clearAllNotifications();
      if (result.ok) {
        router.refresh();
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
