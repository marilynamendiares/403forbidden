// Типы событий и полезных нагрузок для нотификаций (MVP)

export type NotificationType =
  | "collab.invite"
  | "chapter.published"
  | "chapter.updated"
  | "comment.new"
  | "mention"
  | "thread.new_post"
  | "thread.post_deleted";

export type TargetType = "user" | "book" | "chapter" | "thread" | "comment";

// Единый формат входящего события в outbox (простой MVP)
export interface NotificationEvent {
  kind: NotificationType;
  actorId?: string | null; // кто инициировал (опционально)
  target: { type: TargetType; id: string }; // к чему относится событие
  // Кого уведомляем — для MVP явно передаем список получателей.
  // (позже можно вычислять по подпискам/фолловингам)
  recipients: string[];
  // Любые доп. данные, попадут в Notification.payload
  payload?: Record<string, unknown>;
}
