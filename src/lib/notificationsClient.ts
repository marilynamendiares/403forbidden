"use client";

import { fetchJson } from "@/lib/apiClient";

export const notificationsFeedPath = "/api/notifications";
export const notificationsCountPath = "/api/notifications/count";

export type NotificationItem = {
  id: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  payload: Record<string, unknown> | null;
  title: string;
  subtitle: string;
  href: string | null;
};

export type NotificationsFeedResponse = {
  items: NotificationItem[];
  nextCursor: string | null;
};

export type NotificationActionBody =
  | { op: "mark-one"; id: string }
  | { op: "mark-all" }
  | { op: "clear-all" };

export type NotificationActionResult = {
  unread?: number;
};

export function fetchNotificationsFeed(url: string) {
  return fetchJson<NotificationsFeedResponse>(url, {
    includeCredentials: true,
  });
}

export function fetchNotificationsCount() {
  return fetchJson<{ count: number }>(notificationsCountPath, {
    includeCredentials: true,
  });
}

export function postNotificationAction(body: NotificationActionBody) {
  return fetchJson<NotificationActionResult>(notificationsFeedPath, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
