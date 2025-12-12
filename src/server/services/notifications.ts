// src/server/services/notifications.ts
import { prisma } from "@/server/db";

export type NotificationView = {
  id: string;
  type: string;
  actorId: string | null;
  targetType: string | null;
  targetId: string | null;
  payload: any;
  isRead: boolean;
  createdAt: Date;

  // 🧩 view-поля для UI
  title: string;
  subtitle: string;
  href: string | null;
};

export type NotificationListResult = {
  items: NotificationView[];
  nextCursor: string | null;
};

export async function getUnreadCount(userId: string) {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });
  return count;
}

// Внутренний тип того, что достаём из БД
type RawNotification = {
  id: string;
  type: string;
  actorId: string | null;
  targetType: string | null;
  targetId: string | null;
  payload: any;
  isRead: boolean;
  createdAt: Date;
};

function formatNotification(n: RawNotification): NotificationView {
  const payload = (n.payload ?? {}) as any;

  let title = n.type;
  let subtitle = "";
  let href: string | null = null;

  switch (n.type) {
    case "chapter.published": {
      const bookSlug: string | undefined =
        payload.bookSlug ?? payload.slug ?? undefined;
      const bookTitle: string =
        payload.bookTitle ??
        payload.bookName ??
        bookSlug ??
        "Untitled book";

      const chapterIndex: number | string | undefined =
        payload.chapterIndex ?? payload.index ?? undefined;
      const chapterTitle: string =
        payload.chapterTitle ??
        (chapterIndex !== undefined ? `Chapter ${chapterIndex}` : "New chapter");

      title = "New chapter!";
      subtitle = `${chapterTitle} — ${bookTitle}`;

      if (bookSlug && chapterIndex !== undefined) {
        href = `/books/${bookSlug}/${chapterIndex}`;
      } else if (bookSlug) {
        href = `/books/${bookSlug}`;
      }
      break;
    }

    case "chapter.posted": {
      const bookSlug: string | undefined = payload.bookSlug ?? undefined;
      const bookTitle: string =
        payload.bookTitle ??
        payload.bookName ??
        bookSlug ??
        "Untitled book";

      const chapterIndex: number | string | undefined =
        payload.chapterIndex ?? undefined;
      const chapterTitle: string =
        payload.chapterTitle ??
        (chapterIndex !== undefined ? `Chapter ${chapterIndex}` : "Chapter");

      const postId: string | undefined = payload.postId ?? payload.id ?? undefined;

      title = "New post!";
      subtitle = `${chapterTitle} — ${bookTitle}`;

      if (bookSlug && chapterIndex !== undefined) {
        href = `/books/${bookSlug}/${chapterIndex}${
          postId ? `#post-${postId}` : ""
        }`;
      } else if (bookSlug) {
        href = `/books/${bookSlug}`;
      }
      break;
    }

    default: {
      // дефолт: humanize type
      // "chapter.posted" -> "chapter posted"
      const plain = n.type.replace(/\./g, " ").replace(/_/g, " ");
      title = plain.charAt(0).toUpperCase() + plain.slice(1);

      const bookTitle: string | undefined =
        payload.bookTitle ??
        payload.bookName ??
        payload.bookSlug ??
        payload.slug ??
        undefined;

      if (bookTitle) {
        subtitle = bookTitle;
      } else {
        subtitle = "";
      }

      href = null;
      break;
    }
  }

  return {
    ...n,
    title,
    subtitle,
    href,
  };
}

export async function listNotificationsForUser(input: {
  userId: string;
  limit: number;
  cursor?: string | null;
}): Promise<NotificationListResult> {
  const { userId, limit, cursor } = input;

  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      actorId: true,
      targetType: true,
      targetId: true,
      payload: true,
      isRead: true,
      createdAt: true,
    },
  });

  let nextCursor: string | null = null;
  let slice = rows;

  if (rows.length > limit) {
    const next = rows.pop()!;
    nextCursor = next.id;
    slice = rows;
  }

  const items = slice.map((n) => formatNotification(n as RawNotification));
  return { items, nextCursor };
}

type NotificationOp =
  | { op: "mark-one"; id: string }
  | { op: "mark-all" }
  | { op: "clear-all" };

export async function applyNotificationOp(userId: string, body: NotificationOp) {
  if (body.op === "mark-one") {
    if (!body.id) throw new Error("Bad Request");
    await prisma.notification.updateMany({
      where: { id: body.id, userId, isRead: false },
      data: { isRead: true },
    });
  } else if (body.op === "mark-all") {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  } else if (body.op === "clear-all") {
    await prisma.notification.deleteMany({ where: { userId } });
  }

  const unread = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return { unread };
}
