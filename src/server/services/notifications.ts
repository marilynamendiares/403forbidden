// src/server/services/notifications.ts
import { prisma } from "@/server/db";

type NotificationPayload = Record<string, unknown>;

function getPayloadString(payload: NotificationPayload, ...keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function getPayloadStringOrNumber(payload: NotificationPayload, ...keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" || typeof value === "number") return value;
  }
  return undefined;
}

export type NotificationView = {
  id: string;
  type: string;
  actorId: string | null;
  targetType: string | null;
  targetId: string | null;
  payload: NotificationPayload;
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

type NotificationCursor = {
  createdAt: string;
  id: string;
};

export async function getUnreadCount(userId: string) {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });
  return count;
}

function encodeNotificationCursor(cursor: NotificationCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeNotificationCursor(cursor: string | null | undefined): NotificationCursor | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    ) as Partial<NotificationCursor>;
    if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string") {
      return null;
    }
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

// Внутренний тип того, что достаём из БД
type RawNotification = {
  id: string;
  type: string;
  actorId: string | null;
  targetType: string | null;
  targetId: string | null;
  payload: NotificationPayload;
  isRead: boolean;
  createdAt: Date;
};

function formatNotification(n: RawNotification): NotificationView {
  const payload = (n.payload ?? {}) as NotificationPayload;

  let title = n.type;
  let subtitle = "";
  let href: string | null = null;

  switch (n.type) {
    case "chapter.published": {
      const arcSlug: string | undefined = getPayloadString(payload, "arcSlug", "slug");
      const arcTitle: string = getPayloadString(payload, "arcTitle") ?? arcSlug ?? "Untitled arc";

      const chapterIndex: number | string | undefined =
        getPayloadStringOrNumber(payload, "chapterIndex", "index");
      const chapterTitle: string =
        getPayloadString(payload, "chapterTitle") ??
        (chapterIndex !== undefined ? `Chapter ${chapterIndex}` : "New chapter");

      title = "New chapter!";
      subtitle = `${chapterTitle} — ${arcTitle}`;

      if (arcSlug && chapterIndex !== undefined) {
        href = `/arcs/${arcSlug}/${chapterIndex}`;
      } else if (arcSlug) {
        href = `/arcs/${arcSlug}`;
      }
      break;
    }

    case "chapter.posted":
    case "chapter.new_post": {
      const arcSlug: string | undefined = getPayloadString(payload, "arcSlug");
      const arcTitle: string = getPayloadString(payload, "arcTitle") ?? arcSlug ?? "Untitled arc";

      const chapterIndex: number | string | undefined =
        getPayloadStringOrNumber(payload, "chapterIndex");
      const chapterTitle: string =
        getPayloadString(payload, "chapterTitle") ??
        (chapterIndex !== undefined ? `Chapter ${chapterIndex}` : "Chapter");

      const postId: string | undefined = getPayloadString(payload, "postId", "id");

      title = "New post!";
      subtitle = `${chapterTitle} — ${arcTitle}`;

      if (arcSlug && chapterIndex !== undefined) {
        href = `/arcs/${arcSlug}/${chapterIndex}${
          postId ? `#post-${postId}` : ""
        }`;
      } else if (arcSlug) {
        href = `/arcs/${arcSlug}`;
      }
      break;
    }

    case "thread.post_reported": {
      const categorySlug = getPayloadString(payload, "categorySlug");
      const threadSlug = getPayloadString(payload, "threadSlug");
      const threadTitle = getPayloadString(payload, "threadTitle") ?? threadSlug ?? "Thread";
      const postId = getPayloadString(payload, "postId");

      title = "Forum post reported";
      subtitle = threadTitle;

      if (categorySlug && threadSlug) {
        href = `/forum/${categorySlug}/${threadSlug}${postId ? `#post-${postId}` : ""}`;
      }
      break;
    }

    default: {
      // дефолт: humanize type
      // "chapter.posted" -> "chapter posted"
      const plain = n.type.replace(/\./g, " ").replace(/_/g, " ");
      title = plain.charAt(0).toUpperCase() + plain.slice(1);

      const arcTitle: string | undefined =
        getPayloadString(payload, "arcTitle", "arcSlug", "slug") ?? undefined;

      if (arcTitle) {
        subtitle = arcTitle;
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
  const decodedCursor = decodeNotificationCursor(cursor);

  const rows = (await prisma.notification.findMany({
    where: {
      userId,
      ...(decodedCursor
        ? {
            OR: [
              { createdAt: { lt: new Date(decodedCursor.createdAt) } },
              {
                createdAt: new Date(decodedCursor.createdAt),
                id: { lt: decodedCursor.id },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
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
  })) as RawNotification[];

  let nextCursor: string | null = null;
  let slice = rows;

  if (rows.length > limit) {
    const next = rows.pop()!;
    nextCursor = encodeNotificationCursor({
      createdAt: next.createdAt.toISOString(),
      id: next.id,
    });
    slice = rows;
  }

  const items = slice.map((n) => formatNotification(n));
  return { items, nextCursor };
}

type NotificationOp =
  | { op: "mark-one"; id: string }
  | { op: "mark-many"; ids: string[] }
  | { op: "mark-all" }
  | { op: "clear-all" };

export async function applyNotificationOp(userId: string, body: NotificationOp) {
  if (body.op === "mark-one") {
    if (!body.id) throw new Error("Bad Request");
    await prisma.notification.updateMany({
      where: { id: body.id, userId, isRead: false },
      data: { isRead: true },
    });
  } else if (body.op === "mark-many") {
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      throw new Error("Bad Request");
    }
    await prisma.notification.updateMany({
      where: { userId, id: { in: body.ids }, isRead: false },
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
