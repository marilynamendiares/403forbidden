// src/features/realtime/server/bus.ts
import { emit as emitRaw } from "@/server/events";

export type AppEventType =
  // forum
  | "thread:new_post"
  | "thread:post_deleted"
  // chapters
  | "chapter:created"
  | "chapter:updated"
  | "chapter:published"
  | "chapter:unpublished"
  | "chapter:deleted"
  | "chapter:opened"
  | "chapter:closed";

export type AppEventPayload = Record<string, unknown>;

export async function publish(type: AppEventType, payload: AppEventPayload) {
  await emitRaw(type, payload);
}
