// src/lib/notifyUnread.ts
export function notifyUnread(detail: { op: "set" | "inc" | "dec" | "clear"; count?: number; delta?: number }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("notif:unread", { detail }));
}
