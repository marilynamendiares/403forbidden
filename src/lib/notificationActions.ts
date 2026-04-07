"use client";

import {
  emitNotificationsReadAll,
  emitNotificationUnread,
} from "@/lib/notificationUnreadEvents";
import { postNotificationAction } from "@/lib/notificationsClient";

export async function markNotificationRead(id: string) {
  const result = await postNotificationAction({ op: "mark-one", id });
  if (typeof result.unread === "number") {
    emitNotificationUnread({ op: "set", count: result.unread });
  }
  return { ok: true, unread: result.unread ?? null };
}

export async function markAllNotificationsRead() {
  const result = await postNotificationAction({ op: "mark-all" });
  emitNotificationUnread({ op: "set", count: result.unread ?? 0 });
  emitNotificationsReadAll();
  return { ok: true, unread: result.unread ?? 0 };
}

export async function clearAllNotifications() {
  await postNotificationAction({ op: "clear-all" });
  emitNotificationUnread({ op: "set", count: 0 });
  emitNotificationsReadAll();
  return { ok: true, unread: 0 };
}
