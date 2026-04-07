type NotificationEventPayload = {
  type?: string;
  event?: string;
  topic?: string;
  name?: string;
};

export function readNotificationEventType(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const message = payload as NotificationEventPayload;
  const value = message.type || message.event || message.topic || message.name;
  return typeof value === "string" ? value : null;
}
