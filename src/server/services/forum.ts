import { prisma } from "@/server/db";
import {
  createThread,
  getCategoryPolicyBySlug,
  syncForumThreadLastActivity,
} from "@/server/repos/forum";
import { isAdminOnlyCategory, restrictedCanPost } from "@/server/forumAcl";
import { isPlayer } from "@/server/player";
import { publish } from "@/features/realtime/server/bus";
import { getAdminUserIds } from "@/server/admin";
import { queueEvent } from "@/server/notify/queue";
import { isUniqueConstraintError } from "@/server/prismaErrors";
import { recordWalletLedgerTx } from "@/server/economyLedger";
import { Prisma } from "@prisma/client";

export class ForumHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function nextWeeklyReset(from: Date) {
  return new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
}

async function getForumPostReputationTotalTx(
  tx: Prisma.TransactionClient,
  postId: string
) {
  const rep = await tx.forumPostReputationGrant.aggregate({
    where: { postId },
    _sum: { amount: true },
  });

  return rep._sum.amount ?? 0;
}

export async function createThreadForUser(input: {
  category: string;
  userId: string;
  isAdmin: boolean;
  title: string;
  content?: string | null;
}) {
  const pol = await getCategoryPolicyBySlug(input.category).catch(() => null);
  const vis = pol?.createThreadVisibility ?? null;
  const effectiveVis = vis ?? (isAdminOnlyCategory(input.category) ? "ADMIN" : "PLAYERS");

  if (effectiveVis === "ADMIN" && !input.isAdmin) {
    throw new ForumHttpError(403, "admin_required");
  }

  if (effectiveVis === "PLAYERS") {
    const player = await isPlayer(input.userId);
    if (!player) {
      throw new ForumHttpError(403, "player_required");
    }
  }

  return createThread({
    categoryId: pol?.id,
    categorySlug: input.category,
    authorId: input.userId,
    title: input.title,
    content: input.content ?? null,
  });
}

export async function createThreadPostForUser(input: {
  category: string;
  slug: string;
  userId: string;
  isAdmin: boolean;
  content: string;
}) {
  const pol = await getCategoryPolicyBySlug(input.category).catch(() => null);
  const vis = pol?.createPostVisibility ?? null;
  const effectiveVis = vis ?? (isAdminOnlyCategory(input.category) ? "ADMIN" : "MEMBERS");

  if (effectiveVis === "ADMIN" && !input.isAdmin) {
    throw new ForumHttpError(403, "admin_required");
  }

  if (effectiveVis === "PLAYERS") {
    const player = await isPlayer(input.userId);
    if (!player) {
      throw new ForumHttpError(403, "player_required");
    }
  }

  if (effectiveVis === "MEMBERS" && !vis) {
    const player = await isPlayer(input.userId);
    if (!player && !restrictedCanPost(input.category)) {
      throw new ForumHttpError(403, "player_required");
    }
  }

  const thread = await prisma.forumThread.findFirst({
    where: {
      slug: input.slug,
      category: { slug: input.category },
      deletedAt: null,
      ...(input.isAdmin ? {} : { hiddenAt: null }),
    },
    select: {
      id: true,
      authorId: true,
      locked: true,
    },
  });
  if (!thread) {
    throw new ForumHttpError(404, "thread_not_found");
  }
  if (thread.locked && !input.isAdmin) {
    throw new ForumHttpError(409, "thread_locked");
  }

  const post = await prisma.forumPost.create({
    data: {
      threadId: thread.id,
      authorId: input.userId,
      content: { type: "markdown", value: input.content },
      markdown: input.content,
    },
    select: {
      id: true,
      threadId: true,
      createdAt: true,
      updatedAt: true,
      markdown: true,
      hiddenAt: true,
      hiddenById: true,
      deletedAt: true,
      deletedById: true,
      authorId: true,
      author: {
        select: {
          id: true,
          username: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      },
    },
  });

  await prisma.forumThread.update({
    where: { id: thread.id },
    data: { lastActivityAt: post.createdAt },
  });

  await publish("thread:new_post", {
    threadId: post.threadId,
    category: input.category,
    slug: input.slug,
    postId: post.id,
    post: {
      id: post.id,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      markdown: post.markdown ?? "",
      hiddenAt: post.hiddenAt?.toISOString() ?? null,
      hiddenById: post.hiddenById ?? null,
      deletedAt: post.deletedAt?.toISOString() ?? null,
      deletedById: post.deletedById ?? null,
      authorId: post.authorId,
      author: post.author,
    },
    at: Date.now(),
  });

  return post;
}

export async function deleteThreadForUser(input: {
  category: string;
  slug: string;
  userId: string;
  isAdmin: boolean;
}) {
  const thread = await prisma.forumThread.findFirst({
    where: { slug: input.slug, category: { slug: input.category }, deletedAt: null },
    select: { id: true, authorId: true },
  });
  if (!thread) {
    throw new ForumHttpError(404, "thread_not_found");
  }

  if (!input.isAdmin && thread.authorId !== input.userId) {
    throw new ForumHttpError(403, "forbidden");
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const visiblePosts = await tx.forumPost.findMany({
      where: {
        threadId: thread.id,
        deletedAt: null,
        hiddenAt: null,
      },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (visiblePosts.length > 0) {
      const repByAuthor = new Map<string, number>();

      for (const post of visiblePosts) {
        const repTotal = await getForumPostReputationTotalTx(tx, post.id);
        if (repTotal <= 0) continue;
        repByAuthor.set(post.authorId, (repByAuthor.get(post.authorId) ?? 0) + repTotal);
      }

      for (const [authorId, repTotal] of repByAuthor) {
        const wallet = await tx.wallet.upsert({
          where: { userId: authorId },
          create: { userId: authorId, reputationTotal: 0 },
          update: {
            reputationTotal: { decrement: repTotal },
          },
          select: {
            eurodollars: true,
            reputationTotal: true,
          },
        });

        await recordWalletLedgerTx(tx, {
          userId: authorId,
          actorUserId: input.userId,
          kind: "forum.thread_deleted_rep_reversal",
          reputationDelta: -repTotal,
          balanceEurodollars: wallet.eurodollars,
          balanceReputationTotal: wallet.reputationTotal,
          targetType: "forum_thread",
          targetId: thread.id,
        });
      }
    }

    await tx.forumPost.updateMany({
      where: { threadId: thread.id, deletedAt: null },
      data: { deletedAt: now, deletedById: input.userId, markdown: null },
    });
    await tx.forumThread.update({
      where: { id: thread.id },
      data: { deletedAt: now, deletedById: input.userId, hiddenAt: null, hiddenById: null },
    });
  });
}

export async function setThreadHiddenForAdmin(input: {
  category: string;
  slug: string;
  userId: string;
  hidden: boolean;
  isAdmin: boolean;
}) {
  if (!input.isAdmin) {
    throw new ForumHttpError(403, "forbidden");
  }

  const thread = await prisma.forumThread.findFirst({
    where: { slug: input.slug, category: { slug: input.category }, deletedAt: null },
    select: { id: true, hiddenAt: true },
  });

  if (!thread) {
    throw new ForumHttpError(404, "thread_not_found");
  }
  if (input.hidden && thread.hiddenAt) {
    throw new ForumHttpError(409, "already_hidden");
  }
  if (!input.hidden && !thread.hiddenAt) {
    throw new ForumHttpError(409, "already_visible");
  }

  const now = new Date();
  return prisma.forumThread.update({
    where: { id: thread.id },
    data: input.hidden
      ? { hiddenAt: now, hiddenById: input.userId }
      : { hiddenAt: null, hiddenById: null },
    select: {
      id: true,
      hiddenAt: true,
      hiddenById: true,
    },
  });
}

export async function setThreadLockedForUser(input: {
  category: string;
  slug: string;
  userId: string;
  locked: boolean;
  isAdmin: boolean;
}) {
  const thread = await prisma.forumThread.findFirst({
    where: { slug: input.slug, category: { slug: input.category }, deletedAt: null },
    select: { id: true, authorId: true, locked: true },
  });

  if (!thread) {
    throw new ForumHttpError(404, "thread_not_found");
  }
  if (!input.isAdmin && thread.authorId !== input.userId) {
    throw new ForumHttpError(403, "forbidden");
  }
  if (input.locked && thread.locked) {
    throw new ForumHttpError(409, "already_locked");
  }
  if (!input.locked && !thread.locked) {
    throw new ForumHttpError(409, "already_open");
  }

  return prisma.forumThread.update({
    where: { id: thread.id },
    data: { locked: input.locked },
    select: { id: true, locked: true },
  });
}

export async function deleteThreadPostForUser(input: {
  postId: string;
  userId: string;
  isAdmin?: boolean;
}) {
  const post = await prisma.forumPost.findUnique({
    where: { id: input.postId },
    select: {
      id: true,
      authorId: true,
      deletedAt: true,
      hiddenAt: true,
      threadId: true,
      thread: {
        select: {
          id: true,
          slug: true,
          category: { select: { slug: true } },
        },
      },
    },
  });

  if (!post) {
    throw new ForumHttpError(404, "not_found");
  }
  if (post.deletedAt) {
    throw new ForumHttpError(409, "already_deleted");
  }
  if (!input.isAdmin && post.authorId !== input.userId) {
    throw new ForumHttpError(403, "forbidden");
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    if (!post.hiddenAt) {
      const repTotal = await getForumPostReputationTotalTx(tx, post.id);
      if (repTotal > 0) {
        const wallet = await tx.wallet.upsert({
          where: { userId: post.authorId },
          create: { userId: post.authorId, reputationTotal: 0 },
          update: {
            reputationTotal: { decrement: repTotal },
          },
          select: {
            eurodollars: true,
            reputationTotal: true,
          },
        });

        await recordWalletLedgerTx(tx, {
          userId: post.authorId,
          actorUserId: input.userId,
          kind: "forum.post_deleted_rep_reversal",
          reputationDelta: -repTotal,
          balanceEurodollars: wallet.eurodollars,
          balanceReputationTotal: wallet.reputationTotal,
          targetType: "forum_post",
          targetId: post.id,
        });
      }
    }

    await tx.forumPost.update({
      where: { id: post.id },
      data: { deletedAt: now, deletedById: input.userId, markdown: null },
    });
  });
  await syncForumThreadLastActivity(post.threadId);

  await publish("thread:post_deleted", {
    threadId: post.thread?.id ?? post.threadId,
    category: post.thread?.category.slug ?? null,
    slug: post.thread?.slug ?? null,
    postId: post.id,
    deletedAt: now.toISOString(),
    deletedById: input.userId,
    at: Date.now(),
  });
}

export async function setThreadPostHiddenForAdmin(input: {
  postId: string;
  userId: string;
  hidden: boolean;
  isAdmin: boolean;
}) {
  if (!input.isAdmin) {
    throw new ForumHttpError(403, "forbidden");
  }

  const post = await prisma.forumPost.findUnique({
    where: { id: input.postId },
    select: {
      id: true,
      authorId: true,
      hiddenAt: true,
      deletedAt: true,
      threadId: true,
      thread: {
        select: {
          id: true,
          slug: true,
          category: { select: { slug: true } },
        },
      },
    },
  });

  if (!post) {
    throw new ForumHttpError(404, "not_found");
  }
  if (post.deletedAt) {
    throw new ForumHttpError(409, "already_deleted");
  }
  if (input.hidden && post.hiddenAt) {
    throw new ForumHttpError(409, "already_hidden");
  }
  if (!input.hidden && !post.hiddenAt) {
    throw new ForumHttpError(409, "already_visible");
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const repTotal = await getForumPostReputationTotalTx(tx, post.id);
    if (repTotal > 0) {
      const wallet = await tx.wallet.upsert({
        where: { userId: post.authorId },
        create: { userId: post.authorId, reputationTotal: 0 },
        update: {
          reputationTotal: input.hidden
            ? { decrement: repTotal }
            : { increment: repTotal },
        },
        select: {
          eurodollars: true,
          reputationTotal: true,
        },
      });

      await recordWalletLedgerTx(tx, {
        userId: post.authorId,
        actorUserId: input.userId,
        kind: input.hidden ? "forum.post_hidden_rep_reversal" : "forum.post_unhidden_rep_restore",
        reputationDelta: input.hidden ? -repTotal : repTotal,
        balanceEurodollars: wallet.eurodollars,
        balanceReputationTotal: wallet.reputationTotal,
        targetType: "forum_post",
        targetId: post.id,
      });
    }

    return tx.forumPost.update({
      where: { id: post.id },
      data: input.hidden
        ? { hiddenAt: now, hiddenById: input.userId }
        : { hiddenAt: null, hiddenById: null },
      select: {
        id: true,
        hiddenAt: true,
        hiddenById: true,
        threadId: true,
      },
    });
  });

  await syncForumThreadLastActivity(post.threadId);

  await publish(input.hidden ? "thread:post_hidden" : "thread:post_unhidden", {
    threadId: post.thread?.id ?? post.threadId,
    category: post.thread?.category.slug ?? null,
    slug: post.thread?.slug ?? null,
    postId: post.id,
    hiddenAt: updated.hiddenAt?.toISOString() ?? null,
    hiddenById: updated.hiddenById ?? null,
    at: Date.now(),
  });

  return updated;
}

export async function reportThreadPostForUser(input: {
  postId: string;
  userId: string;
}) {
  const post = await prisma.forumPost.findUnique({
    where: { id: input.postId },
    select: {
      id: true,
      authorId: true,
      deletedAt: true,
      thread: {
        select: {
          id: true,
          slug: true,
          title: true,
          category: { select: { slug: true } },
        },
      },
    },
  });

  if (!post || !post.thread) {
    throw new ForumHttpError(404, "not_found");
  }
  if (post.deletedAt) {
    throw new ForumHttpError(409, "post_deleted");
  }
  if (post.authorId === input.userId) {
    throw new ForumHttpError(409, "cannot_report_own_post");
  }

  try {
    await prisma.forumPostReport.create({
      data: {
        postId: post.id,
        reporterId: input.userId,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }
    return { ok: true as const, alreadyReported: true };
  }

  const adminIds = (await getAdminUserIds()).filter((id) => id !== input.userId);
  if (adminIds.length > 0) {
    await queueEvent({
      kind: "thread.post_reported",
      actorId: input.userId,
      target: { type: "thread", id: post.thread.id },
      recipients: adminIds,
      payload: {
        categorySlug: post.thread.category.slug,
        threadSlug: post.thread.slug,
        threadTitle: post.thread.title,
        postId: post.id,
      },
    });
  }

  return { ok: true as const, alreadyReported: false };
}

export async function dismissThreadPostReportsForAdmin(input: {
  postId: string;
  userId: string;
  isAdmin: boolean;
}) {
  if (!input.isAdmin) {
    throw new ForumHttpError(403, "admin_required");
  }

  const post = await prisma.forumPost.findUnique({
    where: { id: input.postId },
    select: { id: true },
  });

  if (!post) {
    throw new ForumHttpError(404, "not_found");
  }

  await prisma.forumPostReport.deleteMany({
    where: { postId: input.postId },
  });

  return { ok: true as const };
}

async function getForumPostReactionTarget(postId: string) {
  const target = await prisma.forumPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      hiddenAt: true,
      deletedAt: true,
    },
  });

  if (!target) {
    throw new ForumHttpError(404, "not_found");
  }
  if (target.deletedAt) {
    throw new ForumHttpError(409, "post_deleted");
  }
  if (target.hiddenAt) {
    throw new ForumHttpError(409, "post_hidden");
  }

  return target;
}

export async function likeForumPostForUser(input: {
  postId: string;
  userId: string;
}) {
  const target = await getForumPostReactionTarget(input.postId);

  if (target.authorId === input.userId) {
    throw new ForumHttpError(409, "cannot_like_own_post");
  }

  await prisma.forumPostLike.upsert({
    where: { userId_postId: { userId: input.userId, postId: input.postId } },
    create: { userId: input.userId, postId: input.postId },
    update: {},
  });

  const likesCount = await prisma.forumPostLike.count({
    where: { postId: input.postId },
  });

  return { ok: true as const, liked: true as const, likesCount };
}

export async function unlikeForumPostForUser(input: {
  postId: string;
  userId: string;
}) {
  await prisma.forumPostLike
    .delete({ where: { userId_postId: { userId: input.userId, postId: input.postId } } })
    .catch(() => null);

  const likesCount = await prisma.forumPostLike.count({
    where: { postId: input.postId },
  });

  return { ok: true as const, liked: false as const, likesCount };
}

export async function grantForumPostReputationForUser(input: {
  postId: string;
  userId: string;
  amount: number;
}) {
  const target = await getForumPostReactionTarget(input.postId);

  if (target.authorId === input.userId) {
    throw new ForumHttpError(409, "cannot_give_reputation_to_yourself");
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
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
      giver.reputationBudget = giver.reputationBudgetMax;
    }

    if (giver.reputationBudget < input.amount) {
      throw new ForumHttpError(409, "not_enough_reputation_budget");
    }

    const existing = await tx.forumPostReputationGrant.findUnique({
      where: { fromUserId_postId: { fromUserId: input.userId, postId: input.postId } },
      select: { id: true },
    });

    if (existing) {
      throw new ForumHttpError(409, "reputation_already_given");
    }

    await tx.forumPostReputationGrant.create({
      data: {
        fromUserId: input.userId,
        toUserId: target.authorId,
        postId: input.postId,
        amount: input.amount,
      },
    });

    await tx.wallet.update({
      where: { userId: input.userId },
      data: {
        reputationBudget: { decrement: input.amount },
      },
    });

    const authorWallet = await tx.wallet.upsert({
      where: { userId: target.authorId },
      create: {
        userId: target.authorId,
        eurodollars: 0,
        reputationTotal: input.amount,
      },
      update: {
        reputationTotal: { increment: input.amount },
      },
      select: {
        eurodollars: true,
        reputationTotal: true,
      },
    });

    const giverWallet = await tx.wallet.findUnique({
      where: { userId: input.userId },
      select: {
        eurodollars: true,
        reputationTotal: true,
      },
    });

    await recordWalletLedgerTx(tx, {
      userId: target.authorId,
      actorUserId: input.userId,
      kind: "forum.post_reputation_received",
      reputationDelta: input.amount,
      balanceEurodollars: authorWallet.eurodollars,
      balanceReputationTotal: authorWallet.reputationTotal,
      targetType: "forum_post",
      targetId: input.postId,
    });

    await recordWalletLedgerTx(tx, {
      userId: input.userId,
      actorUserId: input.userId,
      kind: "forum.post_reputation_budget_spent",
      balanceEurodollars: giverWallet?.eurodollars ?? 0,
      balanceReputationTotal: giverWallet?.reputationTotal ?? 0,
      targetType: "forum_post",
      targetId: input.postId,
    });
  });

  const rep = await prisma.forumPostReputationGrant.aggregate({
    where: { postId: input.postId },
    _sum: { amount: true },
  });

  return { ok: true as const, repCount: rep._sum.amount ?? 0 };
}
