// src/server/services/chapters.ts
import { prisma } from "@/server/db";
import { publish } from "@/features/realtime/server/bus";
import { ChapterStatus, Prisma } from "@prisma/client";
import { requireRole } from "@/server/access";
import { emit } from "@/server/events";
import { getArcViewerAccess } from "@/server/arcs/access";
import { requirePlayer } from "@/server/player";
import { queueEvent, drainOutbox } from "@/server/notify/queue";
import {
  refreshDiscoveryContentForArc,
  refreshDiscoveryForArc,
  refreshDiscoveryMetricsForArc,
  refreshDiscoverySearchForArc,
} from "@/server/arcs/discoveryPipeline";
import { sanitizeHtml } from "@/server/render/sanitizeHtml";
import { recordWalletLedgerTx } from "@/server/economyLedger";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type OpenCloseInput = {
  userId: string;
  arcSlug: string;
  chapterId: string; // это именно ID главы (а не index)
};

const REOPEN_PENALTY = 10;
const AWARD_EURODOLLARS_ON_CLOSE = 50;

export async function openChapter(input: OpenCloseInput) {
  return toggleChapterStatus(input, "OPEN");
}

export async function closeChapter(input: OpenCloseInput) {
  return toggleChapterStatus(input, "CLOSED");
}

async function toggleChapterStatus(
  { userId, arcSlug, chapterId }: OpenCloseInput,
  next: "OPEN" | "CLOSED"
) {
  // 1) Находим арку по slug (findFirst, т.к. unique у вас другой — ownerId_slug)
  const arc = await prisma.arc.findFirst({
    where: { slug: arcSlug },
    select: { id: true, ownerId: true, slug: true },
  });
  if (!arc) throw new HttpError(404, "Arc not found");

  // 2) Находим главу по id в пределах арки
  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, arcId: arc.id },
    select: { id: true, status: true },
  });
  if (!chapter) throw new HttpError(404, "Chapter not found");

  // 3) ACL: только OWNER или EDITOR
  const isOwner = userId === arc.ownerId;
  let isEditor = false;
  if (!isOwner) {
    const collab = await prisma.collaborator.findFirst({
      where: { arcId: arc.id, userId, pageId: null },
      select: { role: true },
    });
    isEditor = collab?.role === "EDITOR" || collab?.role === "OWNER";
  }
  if (!isOwner && !isEditor) {
    throw new HttpError(403, "Forbidden");
  }

  // 4) Нет изменений
  if (chapter.status === next) {
    return { id: chapter.id, status: next };
  }

  // 5) Обновляем статус
  const updated = await prisma.chapter.update({
    where: { id: chapter.id },
    data: { status: next as ChapterStatus },
    select: { id: true, status: true },
  });

  await refreshDiscoveryMetricsForArc(arc.id);

  // 6) SSE событие
  const evt = next === "OPEN" ? "chapter:opened" : "chapter:closed";
  await publish(evt, {
    arcSlug,
    chapterId: updated.id,
    status: updated.status,
    updatedBy: userId,
  });

  return updated;
}

export async function reopenChapterForUser(input: OpenCloseInput) {
  const { userId, arcSlug, chapterId } = input;

  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, arc: { slug: arcSlug } },
    select: {
      id: true,
      index: true,
      status: true,
      completedAt: true,
      isDraft: true,
      publishedAt: true,
      arc: { select: { id: true, ownerId: true } },
    },
  });

  if (!chapter) {
    throw new HttpError(404, "Chapter not found");
  }

  const isOwner = userId === chapter.arc.ownerId;
  const role = await getArcRoleForUser(userId, chapter.arc.id);

  if (!isOwner && role !== "EDITOR") {
    throw new HttpError(403, "Forbidden");
  }

  if (chapter.status === "OPEN") {
    throw new HttpError(409, "Chapter already open");
  }

  if (chapter.isDraft || !chapter.publishedAt) {
    throw new HttpError(409, "Cannot reopen draft chapter");
  }

  if (chapter.completedAt) {
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
        create: { userId },
        update: {},
        select: { eurodollars: true },
      });

      if (wallet.eurodollars < REOPEN_PENALTY) {
        return {
          ok: false as const,
          error: "NOT_ENOUGH_FUNDS" as const,
          eurodollars: wallet.eurodollars,
        };
      }

      await tx.wallet.update({
        where: { userId },
        data: { eurodollars: { decrement: REOPEN_PENALTY } },
      });

      await recordWalletLedgerTx(tx, {
        userId,
        actorUserId: userId,
        kind: "chapter.reopen_penalty",
        eurodollarsDelta: -REOPEN_PENALTY,
        balanceEurodollars: wallet.eurodollars - REOPEN_PENALTY,
        targetType: "chapter",
        targetId: chapter.id,
      });

      const updated = await tx.chapter.update({
        where: { id: chapter.id },
        data: { status: "OPEN" },
        select: { id: true, status: true },
      });

      return { ok: true as const, updated, penalty: REOPEN_PENALTY };
    });

    if (!result.ok) {
      return {
        ok: false as const,
        error: result.error,
        eurodollars: result.eurodollars,
        required: REOPEN_PENALTY,
      };
    }

    await refreshDiscoveryForArc(chapter.arc.id);

    emit("chapter:opened", {
      slug: arcSlug,
      index: chapter.index,
      chapterId: chapter.id,
      status: result.updated.status,
      at: Date.now(),
    });

    return {
      ok: true as const,
      status: result.updated.status,
      penaltyEurodollars: result.penalty,
    };
  }

  const updated = await prisma.chapter.update({
    where: { id: chapter.id },
    data: { status: "OPEN" },
    select: { id: true, status: true },
  });

  await refreshDiscoveryForArc(chapter.arc.id);

  emit("chapter:opened", {
    slug: arcSlug,
    index: chapter.index,
    chapterId: chapter.id,
    status: updated.status,
    at: Date.now(),
  });

  return { ok: true as const, status: updated.status, penaltyEurodollars: 0 };
}

export async function completeChapterForUser(input: OpenCloseInput) {
  const { userId, arcSlug, chapterId } = input;

  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, arc: { slug: arcSlug } },
    select: {
      id: true,
      index: true,
      status: true,
      isDraft: true,
      publishedAt: true,
      arc: { select: { id: true, ownerId: true } },
    },
  });

  if (!chapter) {
    throw new HttpError(404, "Chapter not found");
  }

  const isOwner = userId === chapter.arc.ownerId;
  const role = await getArcRoleForUser(userId, chapter.arc.id);

  if (!isOwner && role !== "EDITOR") {
    throw new HttpError(403, "Forbidden");
  }

  if (chapter.isDraft || !chapter.publishedAt) {
    throw new HttpError(409, "Cannot close draft chapter");
  }

  const result = await prisma.$transaction(async (tx) => {
    const now = new Date();

    const first = await tx.chapter.updateMany({
      where: { id: chapter.id, status: "OPEN", completedAt: null },
      data: { status: "CLOSED", completedAt: now },
    });

    if (first.count === 1) {
      const updatedWallet = await tx.wallet.upsert({
        where: { userId },
        create: { userId, eurodollars: AWARD_EURODOLLARS_ON_CLOSE },
        update: { eurodollars: { increment: AWARD_EURODOLLARS_ON_CLOSE } },
        select: {
          eurodollars: true,
          reputationTotal: true,
        },
      });

      await recordWalletLedgerTx(tx, {
        userId,
        actorUserId: userId,
        kind: "chapter.completed_reward",
        eurodollarsDelta: AWARD_EURODOLLARS_ON_CLOSE,
        balanceEurodollars: updatedWallet.eurodollars,
        balanceReputationTotal: updatedWallet.reputationTotal,
        targetType: "chapter",
        targetId: chapter.id,
      });

      return { ok: true as const, awarded: AWARD_EURODOLLARS_ON_CLOSE };
    }

    const repeat = await tx.chapter.updateMany({
      where: { id: chapter.id, status: "OPEN", completedAt: { not: null } },
      data: { status: "CLOSED" },
    });

    if (repeat.count === 1) {
      return { ok: true as const, awarded: 0 };
    }

    return { ok: false as const, awarded: 0 };
  });

  if (!result.ok) {
    throw new HttpError(409, "Chapter already closed");
  }

  await refreshDiscoveryForArc(chapter.arc.id);

  emit("chapter:closed", {
    slug: arcSlug,
    index: chapter.index,
    chapterId: chapter.id,
    status: "CLOSED",
    at: Date.now(),
  });

  return {
    ok: true as const,
    status: "CLOSED" as const,
    awardedEurodollars: result.awarded,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Список глав + создание главы (для /api/arcs/[slug]/chapters)
// ─────────────────────────────────────────────────────────────────────────────

export async function listChaptersForViewer(input: {
  slug: string;
  viewerId?: string | null;
}) {
  const { slug, viewerId } = input;

  const arc = await prisma.arc.findFirst({
    where: { slug },
    select: { id: true, title: true, ownerId: true, searchVisibility: true },
  });
  if (!arc) return null;

  const access = await getArcViewerAccess({ viewerId, arc });
  if (!access.canRead) return null;

  const chapters = await prisma.chapter.findMany({
    where: {
      arcId: arc.id,
      ...(access.canReadDrafts ? {} : { isDraft: false, publishedAt: { not: null } }),
    },
    orderBy: [{ index: "asc" }],
    select: {
      id: true,
      index: true,
      title: true,
      isDraft: true,
      publishedAt: true,
      createdAt: true,
      _count: {
        select: {
          posts: true, // ✅ Chapter.posts relation
        },
      },
    },
  });

  return {
    arc: { id: arc.id, title: arc.title, ownerId: arc.ownerId },
    chapters,
  };
}

type CreateChapterInput = {
  slug: string;
  userId: string;
  title: string;
  content: string;
  publish?: boolean;
};

export async function createChapterForUser(input: CreateChapterInput) {
  const { slug, userId, title, content, publish: shouldPublish } = input;

  const arc = await prisma.arc.findFirst({
    where: { slug },
    select: { id: true, ownerId: true },
  });
  if (!arc) {
    throw new HttpError(404, "Arc not found");
  }

  await requirePlayer(userId);
  await requireRole(userId, arc.id, "EDITOR");

  const isDraft = !shouldPublish;
  const publishRole = userId === arc.ownerId ? "OWNER" : "EDITOR";

  let created:
    | {
        id: string;
        index: number;
        isDraft: boolean;
      }
    | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const lastChapter = await prisma.chapter.findFirst({
      where: { arcId: arc.id },
      orderBy: { index: "desc" },
      select: { index: true },
    });
    const nextIndex = (lastChapter?.index ?? 0) + 1;

    try {
      created = await prisma.chapter.create({
        data: {
          arcId: arc.id,
          index: nextIndex,
          title,
          content: { type: "markdown", value: content },
          markdown: content,
          isDraft,
          publishedAt: isDraft ? null : new Date(),
          publishRole,
          authorId: userId,
        },
        select: { id: true, index: true, isDraft: true },
      });
      break;
    } catch (error) {
      const isArcIndexConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";

      if (!isArcIndexConflict || attempt === 2) {
        throw error;
      }
    }
  }

  if (!created) {
    throw new HttpError(500, "Failed to create chapter");
  }

  // SSE: обновить список глав
  await publish("chapter:created", {
    slug,
    index: created.index,
    chapterId: created.id,
    at: Date.now(),
  });

  // Если глава создана сразу опубликованной — шлём уведомления как в /publish
  if (!created.isDraft) {
    // 1) собрать получателей: владелец, коллабораторы, фолловеры арки
    const [collabs, followers, owner] = await Promise.all([
      prisma.collaborator.findMany({
        where: { arcId: arc.id },
        select: { userId: true },
      }),
      prisma.arcFollow.findMany({
        where: { arcId: arc.id },
        select: { userId: true },
      }),
      prisma.arc.findUnique({
        where: { id: arc.id },
        select: { ownerId: true },
      }),
    ]);

    const followerIds = new Set<string>(followers.map((f) => f.userId));

    const recipients = new Set<string>();
    if (owner?.ownerId) recipients.add(owner.ownerId);
    collabs.forEach((c) => recipients.add(c.userId));
    followerIds.forEach((id) => recipients.add(id));

    // Автор получает уведомление ТОЛЬКО если сам подписан на арку
    if (!followerIds.has(userId)) {
      recipients.delete(userId);
    }

    // 2) сложить событие в очередь
    await queueEvent({
      kind: "chapter.published",
      actorId: userId,
      target: { type: "chapter", id: created.id },
      recipients: [...recipients],
      payload: {
        arcId: arc.id,
        arcSlug: slug,
        arcTitle: title,
        chapterIndex: created.index,
      },
    });

    // 3) SSE: событие публикации для live-списка
    await publish("chapter:published", {
      slug,
      index: created.index,
      chapterId: created.id,
      at: Date.now(),
    });

    // 4) На деве — авто-дренаж, чтобы сразу увидеть уведомление
    if (process.env.NODE_ENV !== "production") {
      await drainOutbox({ limit: 100 });
    }
  }

  await refreshDiscoveryContentForArc(arc.id);

  return created;
}

type PublishChapterInput = {
  userId: string;
  slug: string;
  index: number;
};

export async function publishChapterForUser(input: PublishChapterInput) {
  const { userId, slug, index } = input;

  const chapter = await prisma.chapter.findFirst({
    where: { arc: { slug }, index },
    select: {
      id: true,
      isDraft: true,
      arcId: true,
      arc: { select: { slug: true, ownerId: true, title: true } },
    },
  });
  if (!chapter) throw new HttpError(404, "Not found");

  await requireRole(userId, chapter.arcId, "EDITOR");

  if (!chapter.isDraft) {
    return { ok: true as const, alreadyPublished: true, id: chapter.id };
  }

  const updated = await prisma.chapter.update({
    where: { id: chapter.id },
    data: { isDraft: false, publishedAt: new Date() },
    select: {
      id: true,
      index: true,
      title: true,
      arcId: true,
      arc: { select: { slug: true, ownerId: true, title: true } },
    },
  });

  await refreshDiscoveryMetricsForArc(updated.arcId);

  const [collabs, followers] = await Promise.all([
    prisma.collaborator.findMany({
      where: { arcId: updated.arcId },
      select: { userId: true },
    }),
    prisma.arcFollow.findMany({
      where: { arcId: updated.arcId },
      select: { userId: true },
    }),
  ]);

  const followerIds = new Set<string>(followers.map((f) => f.userId));
  const recipients = new Set<string>();

  recipients.add(updated.arc.ownerId);
  collabs.forEach((c) => recipients.add(c.userId));
  followerIds.forEach((id) => recipients.add(id));

  if (!followerIds.has(userId)) {
    recipients.delete(userId);
  }

  await queueEvent({
    kind: "chapter.published",
    actorId: userId,
    target: { type: "chapter", id: updated.id },
    recipients: [...recipients],
    payload: {
      arcId: updated.arcId,
      arcSlug: updated.arc.slug,
      arcTitle: updated.arc.title,
      chapterIndex: updated.index,
      chapterTitle: updated.title,
    },
  });

  await publish("chapter:published", {
    slug: updated.arc.slug,
    id: updated.id,
  });

  if (process.env.NODE_ENV !== "production") {
    await drainOutbox({ limit: 100 });
  }

  return {
    ok: true as const,
    id: updated.id,
    recipientsCount: recipients.size,
  };
}

type UpdateChapterInput = {
  userId: string;
  slug: string;
  index: number;
  title?: string;
  content?: string;
};

export async function updateChapterForUser(input: UpdateChapterInput) {
  const { userId, slug, index, title, content } = input;

  if (title === undefined && content === undefined) {
    throw new HttpError(400, "Nothing to update");
  }

  const chapter = await prisma.chapter.findFirst({
    where: { arc: { slug }, index },
    select: {
      id: true,
      authorId: true,
      arcId: true,
      arc: { select: { ownerId: true } },
    },
  });
  if (!chapter) throw new HttpError(404, "Not found");

  const isAuthor = chapter.authorId === userId;

  if (!isAuthor) {
    throw new HttpError(403, "Forbidden");
  }

  const safeContent =
    content !== undefined ? sanitizeHtml(content) : undefined;

  const updated = await prisma.chapter.update({
    where: { id: chapter.id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(safeContent !== undefined
        ? {
            markdown: safeContent,
            content: { type: "markdown", value: safeContent },
            contentHtml: safeContent,
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      publishedAt: true,
      status: true,
    },
  });

  await refreshDiscoveryForArc(chapter.arcId);

  await publish("chapter:updated", {
    slug,
    index,
    chapterId: updated.id,
    publishedAt: updated.publishedAt ?? null,
    at: Date.now(),
  });

  return updated;
}

type DeleteChapterInput = {
  userId: string;
  slug: string;
  index: number;
};

export async function deleteChapterForUser(input: DeleteChapterInput) {
  const { userId, slug, index } = input;

  const chapter = await prisma.chapter.findFirst({
    where: { arc: { slug }, index },
    select: {
      id: true,
      arcId: true,
      arc: { select: { ownerId: true } },
    },
  });
  if (!chapter) throw new HttpError(404, "Not found");

  const isOwner = chapter.arc.ownerId === userId;
  if (!isOwner) throw new HttpError(403, "Forbidden");

  await prisma.chapter.delete({ where: { id: chapter.id } });
  await refreshDiscoveryForArc(chapter.arcId);

  await publish("chapter:deleted", {
    slug,
    index,
    chapterId: chapter.id,
    at: Date.now(),
  });

  return { ok: true as const };
}

type ChapterPostTargetInput = {
  slug: string;
  index: number;
  postId: string;
};

async function getChapterPostTarget(input: ChapterPostTargetInput) {
  const target = await prisma.chapterPost.findFirst({
    where: {
      id: input.postId,
      chapter: {
        index: input.index,
        arc: { slug: input.slug },
      },
    },
    select: {
      id: true,
      authorId: true,
      chapter: {
        select: {
          id: true,
          arcId: true,
        },
      },
    },
  });

  if (!target) {
    throw new HttpError(404, "Not found");
  }

  return target;
}

export async function likeChapterPostForUser(input: {
  slug: string;
  index: number;
  postId: string;
  userId: string;
}) {
  const target = await getChapterPostTarget(input);

  if (target.authorId === input.userId) {
    throw new HttpError(409, "Cannot like your own post");
  }

  await prisma.chapterPostLike.upsert({
    where: { userId_postId: { userId: input.userId, postId: input.postId } },
    create: { userId: input.userId, postId: input.postId },
    update: {},
  });

  await refreshDiscoveryMetricsForArc(target.chapter.arcId);

  const likesCount = await prisma.chapterPostLike.count({
    where: { postId: input.postId },
  });

  return { ok: true as const, liked: true as const, likesCount };
}

export async function unlikeChapterPostForUser(input: {
  slug: string;
  index: number;
  postId: string;
  userId: string;
}) {
  const target = await getChapterPostTarget(input);

  await prisma.chapterPostLike
    .delete({ where: { userId_postId: { userId: input.userId, postId: input.postId } } })
    .catch(() => null);

  await refreshDiscoveryMetricsForArc(target.chapter.arcId);

  const likesCount = await prisma.chapterPostLike.count({
    where: { postId: input.postId },
  });

  return { ok: true as const, liked: false as const, likesCount };
}

export async function updateChapterPostForUser(input: {
  slug: string;
  index: number;
  postId: string;
  userId: string;
  content: string;
}) {
  const target = await prisma.chapterPost.findFirst({
    where: {
      id: input.postId,
      chapter: {
        index: input.index,
        arc: { slug: input.slug },
      },
    },
    select: {
      id: true,
      authorId: true,
      chapter: {
        select: {
          id: true,
          arcId: true,
          arc: { select: { ownerId: true } },
        },
      },
    },
  });

  if (!target) {
    throw new HttpError(404, "Not found");
  }

  const isOwner = input.userId === target.chapter.arc.ownerId;
  const isAuthor = input.userId === target.authorId;
  if (!isOwner && !isAuthor) {
    throw new HttpError(403, "Forbidden");
  }

  const rawHtml = input.content;
  const safeHtml = sanitizeHtml(rawHtml);
  const editedAt = new Date();

  const updated = await prisma.chapterPost.update({
    where: { id: target.id },
    data: {
      contentMd: rawHtml,
      contentHtml: safeHtml,
      editedAt,
    },
    select: {
      id: true,
      contentMd: true,
      contentHtml: true,
      editedAt: true,
    },
  });

  await refreshDiscoverySearchForArc(target.chapter.arcId);

  emit("chapter:post_updated", {
    slug: input.slug,
    index: input.index,
    chapterId: target.chapter.id,
    postId: updated.id,
    contentMd: updated.contentHtml ?? updated.contentMd,
    editedAt: updated.editedAt?.toISOString() ?? null,
    at: Date.now(),
  });

  return {
    ok: true as const,
    post: {
      ...updated,
      contentMd: updated.contentHtml ?? updated.contentMd,
    },
  };
}

export async function deleteChapterPostForUser(input: {
  slug: string;
  index: number;
  postId: string;
  userId: string;
}) {
  const target = await prisma.chapterPost.findFirst({
    where: {
      id: input.postId,
      chapter: {
        index: input.index,
        arc: { slug: input.slug },
      },
    },
    select: {
      id: true,
      authorId: true,
      chapter: {
        select: {
          id: true,
          arcId: true,
          arc: { select: { ownerId: true } },
        },
      },
    },
  });

  if (!target) {
    throw new HttpError(404, "Not found");
  }

  const isOwner = input.userId === target.chapter.arc.ownerId;
  const isAuthor = input.userId === target.authorId;
  if (!isOwner && !isAuthor) {
    throw new HttpError(403, "Forbidden");
  }

  await prisma.chapterPost.delete({ where: { id: target.id } });

  const last = await prisma.chapterPost.findFirst({
    where: { chapterId: target.chapter.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { createdAt: true },
  });

  await prisma.chapter.update({
    where: { id: target.chapter.id },
    data: { lastPostAt: last?.createdAt ?? null },
  });

  await refreshDiscoveryContentForArc(target.chapter.arcId);

  emit("chapter:post_deleted", {
    slug: input.slug,
    index: input.index,
    chapterId: target.chapter.id,
    postId: input.postId,
    at: Date.now(),
  });

  return { ok: true as const };
}

function nextWeeklyReset(from: Date) {
  return new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
}

export async function grantChapterPostReputationForUser(input: {
  slug: string;
  index: number;
  postId: string;
  userId: string;
  amount: number;
}) {
  const target = await getChapterPostTarget(input);

  if (target.authorId === input.userId) {
    throw new HttpError(409, "Cannot give reputation to yourself");
  }

  const now = new Date();

  const out = await prisma.$transaction(async (tx) => {
    const giver = await tx.wallet.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        eurodollars: 0,
        reputationTotal: 0,
        reputationBudget: 10,
        reputationBudgetMax: 10,
        reputationBudgetResetAt: nextWeeklyReset(now),
      },
      update: {},
    });

    const shouldReset =
      !giver.reputationBudgetResetAt || giver.reputationBudgetResetAt <= now;

    if (shouldReset) {
      await tx.wallet.update({
        where: { userId: input.userId },
        data: {
          reputationBudget: giver.reputationBudgetMax,
          reputationBudgetResetAt: nextWeeklyReset(now),
        },
      });
    }

    const fresh = await tx.wallet.findUnique({
      where: { userId: input.userId },
      select: { reputationBudget: true },
    });
    const budget = fresh?.reputationBudget ?? 0;

    if (budget < input.amount) {
      return { ok: false as const, reason: "NO_BUDGET" as const, budget };
    }

    const existing = await tx.chapterPostReputationGrant.findUnique({
      where: {
        fromUserId_postId: {
          fromUserId: input.userId,
          postId: input.postId,
        },
      },
      select: { id: true },
    });
    if (existing) {
      return { ok: false as const, reason: "ALREADY_GIVEN" as const, budget };
    }

    await tx.chapterPostReputationGrant.create({
      data: {
        fromUserId: input.userId,
        toUserId: target.authorId,
        postId: input.postId,
        amount: input.amount,
      },
    });

    await tx.wallet.update({
      where: { userId: input.userId },
      data: { reputationBudget: { decrement: input.amount } },
    });

    await tx.wallet.upsert({
      where: { userId: target.authorId },
      create: { userId: target.authorId, reputationTotal: input.amount },
      update: { reputationTotal: { increment: input.amount } },
    });

    return { ok: true as const, budgetLeft: budget - input.amount };
  });

  if (!out.ok) {
    return { ok: false as const, error: out.reason, budget: out.budget };
  }

  await refreshDiscoveryMetricsForArc(target.chapter.arcId);

  const repCount = await prisma.chapterPostReputationGrant.aggregate({
    where: { postId: input.postId },
    _sum: { amount: true },
  });

  return {
    ok: true as const,
    given: input.amount,
    repCount: repCount._sum.amount ?? 0,
    giverBudgetLeft: out.budgetLeft,
  };
}

async function getArcRoleForUser(userId: string, arcId: string) {
  if (!userId) return null;
  const collab = await prisma.collaborator.findFirst({
    where: { arcId, userId, pageId: null },
    select: { role: true },
  });
  return collab?.role ?? null;
}
