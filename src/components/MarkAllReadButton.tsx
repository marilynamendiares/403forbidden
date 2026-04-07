// src/components/MarkAllReadButton.tsx
"use client";

import { useState } from "react";
import { markAllNotificationsRead } from "@/lib/notificationActions";

export function MarkAllReadButton() {
  const [loading, setLoading] = useState(false);

  const markAll = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await markAllNotificationsRead();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={markAll}
      disabled={loading}
      className="rounded bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20 disabled:opacity-50"
    >
      {loading ? "Marking…" : "Mark all read"}
    </button>
  );
}
