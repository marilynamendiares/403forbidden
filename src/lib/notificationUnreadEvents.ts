"use client";

export const notificationUnreadEventName = "notif:unread";
export const notificationsReadAllEventName = "notifications:read_all";

export type NotificationUnreadDetail = {
  op?: "set" | "inc" | "dec" | "clear";
  count?: number;
  delta?: number;
};

export function readNotificationUnreadDetail(event: Event): NotificationUnreadDetail | null {
  if (!(event instanceof CustomEvent)) return null;
  const detail = event.detail;
  if (!detail || typeof detail !== "object") return null;
  return detail as NotificationUnreadDetail;
}

export function emitNotificationUnread(detail: NotificationUnreadDetail) {
  window.dispatchEvent(new CustomEvent(notificationUnreadEventName, { detail }));
}

export function emitNotificationsReadAll() {
  window.dispatchEvent(new CustomEvent(notificationsReadAllEventName));
}
