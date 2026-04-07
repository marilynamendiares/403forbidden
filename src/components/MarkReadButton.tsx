// src/components/MarkReadButton.tsx
"use client";

import { useEffect, useState } from "react";
import {
  markNotificationRead,
} from "@/lib/notificationActions";
import {
  notificationsReadAllEventName,
} from "@/lib/notificationUnreadEvents";

export function MarkReadButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onAll = () => setDone(true);
    window.addEventListener(notificationsReadAllEventName, onAll);
    return () => window.removeEventListener(notificationsReadAllEventName, onAll);
  }, []);

  const markOne = async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      const result = await markNotificationRead(id);
      if (result.ok) {
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
