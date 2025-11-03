// Обертка над общим эмиттером событий (SSE ядро из 1.4)

import { emit } from "@/server/events"; // предполагается, что уже есть в проекте

export function topicForUser(userId: string) {
  return `notify:user:${userId}`;
}

// Локальный хелпер для отправки "легковесного" уведомления по SSE
export async function emitNotifyUser(
  userId: string,
  data: { id: string; type: string; targetType: string; targetId: string; createdAt: string; isRead: boolean }
) {
  try {
    await emit(topicForUser(userId), data);
  } catch (err) {
    // Без падений: лог при желании
    console.error("[notify] emit error", err);
  }
}
