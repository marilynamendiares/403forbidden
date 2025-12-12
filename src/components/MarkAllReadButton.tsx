// src/components/MarkAllReadButton.tsx
"use client";

import { useState } from "react";
import { notifyUnread } from "@/lib/notifyUnread";

export function MarkAllReadButton() {
  const [loading, setLoading] = useState(false);

  const markAll = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "mark-all" }),
      });
      if (res.ok) {
        const { unread } = await res.json().catch(() => ({ unread: 0 }));
        notifyUnread({ op: "set", count: unread }); // обычно 0

        // ⬇️ сообщаем всем кнопкам в списке, что всё прочитано
        window.dispatchEvent(new CustomEvent("notifications:read_all"));
      }
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
