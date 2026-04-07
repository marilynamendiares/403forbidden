import { prisma } from "@/server/db";
import { recordWalletLedgerTx } from "@/server/economyLedger";

export type AdminForumReportRow = {
  id: string;
  createdAt: Date;
  reporter: {
    id: string;
    username: string;
    email: string;
    profile: { displayName: string | null } | null;
  };
  post: {
    id: string;
    authorId: string;
    markdown: string | null;
    deletedAt: Date | null;
    hiddenAt: Date | null;
    thread: {
      id: string;
      title: string;
      slug: string;
      category: { slug: string; title: string };
    };
  };
};

export type AdminDashboardSummary = {
  reportCount: number;
  walletActivityCount: number;
  shopAcquisitionCount: number;
  latestReports: AdminForumReportRow[];
  characterQueueCount: number;
  submittedCount: number;
  underReviewCount: number;
  latestCharacterQueue: {
    id: string;
    name: string;
    status: "SUBMITTED" | "UNDER_REVIEW";
    updatedAt: Date;
    user: {
      username: string;
      email: string;
      profile: { displayName: string | null } | null;
    };
  }[];
  latestWalletActivity: {
    id: string;
    kind: string;
    eurodollarsDelta: number;
    reputationDelta: number;
    createdAt: Date;
    user: {
      username: string;
      profile: { displayName: string | null } | null;
    };
  }[];
  latestShopAcquisitions: {
    id: string;
    createdAt: Date;
    item: {
      id: string;
      slug: string;
      title: string;
      category: string;
      priceEurodollars: number;
    };
    user: {
      username: string;
      profile: { displayName: string | null } | null;
    };
  }[];
};

type AdminWalletActivityRow = {
  id: string;
  kind: string;
  eurodollarsDelta: number;
  reputationDelta: number;
  createdAt: Date;
  user: {
    username: string;
    profile: { displayName: string | null } | null;
  };
};

type AdminShopAcquisitionRow = {
  id: string;
  createdAt: Date;
  item: {
    id: string;
    slug: string;
    title: string;
    category: string;
    priceEurodollars: number;
  };
  user: {
    username: string;
    profile: { displayName: string | null } | null;
  };
};

export type AdminUserLookupRow = {
  id: string;
  username: string;
  email: string;
  profile: { displayName: string | null; avatarUrl: string | null } | null;
};

export async function listForumPostReportsForAdmin(limit = 50): Promise<AdminForumReportRow[]> {
  return prisma.forumPostReport.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: {
      id: true,
      createdAt: true,
      reporter: {
        select: {
          id: true,
          username: true,
          email: true,
          profile: { select: { displayName: true } },
        },
      },
      post: {
        select: {
          id: true,
          authorId: true,
          markdown: true,
          deletedAt: true,
          hiddenAt: true,
          thread: {
            select: {
              id: true,
              title: true,
              slug: true,
              category: {
                select: {
                  slug: true,
                  title: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const walletLedger = (prisma as typeof prisma & {
    walletLedger: {
      findMany: (args: object) => Promise<AdminWalletActivityRow[]>;
      count: () => Promise<number>;
    };
  }).walletLedger;

  const [
    latestReports,
    reportCount,
    walletActivityCount,
    shopAcquisitionCount,
    characterGroups,
    latestCharacterQueue,
    latestWalletActivity,
    latestShopAcquisitions,
  ] = await Promise.all([
    listForumPostReportsForAdmin(6),
    prisma.forumPostReport.count(),
    walletLedger.count(),
    prisma.inventoryItem.count(),
    prisma.characterApplication.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: {
        status: {
          in: ["SUBMITTED", "UNDER_REVIEW"],
        },
      },
    }),
    prisma.characterApplication.findMany({
      where: {
        status: {
          in: ["SUBMITTED", "UNDER_REVIEW"],
        },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 6,
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
        user: {
          select: {
            username: true,
            email: true,
            profile: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    }),
    walletLedger.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 8,
      select: {
        id: true,
        kind: true,
        eurodollarsDelta: true,
        reputationDelta: true,
        createdAt: true,
        user: {
          select: {
            username: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    }),
    prisma.inventoryItem.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 8,
      select: {
        id: true,
        createdAt: true,
        item: {
          select: {
            id: true,
            slug: true,
            title: true,
            category: true,
            priceEurodollars: true,
          },
        },
        user: {
          select: {
            username: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    }),
  ]);

  const submittedCount =
    characterGroups.find((row: { status: string; _count: { _all: number } }) => row.status === "SUBMITTED")?._count._all ?? 0;
  const underReviewCount =
    characterGroups.find((row: { status: string; _count: { _all: number } }) => row.status === "UNDER_REVIEW")?._count._all ?? 0;

  return {
    reportCount,
    walletActivityCount,
    shopAcquisitionCount,
    latestReports,
    characterQueueCount: submittedCount + underReviewCount,
    submittedCount,
    underReviewCount,
    latestCharacterQueue: latestCharacterQueue.map((item: typeof latestCharacterQueue[number]) => ({
      ...item,
      status: item.status as "SUBMITTED" | "UNDER_REVIEW",
    })),
    latestWalletActivity,
    latestShopAcquisitions: latestShopAcquisitions as AdminShopAcquisitionRow[],
  };
}

function getAdminUserFilter(query?: string) {
  const normalized = query?.trim().replace(/^@/, "") ?? "";
  if (normalized.length < 2) {
    return undefined;
  }

  return {
    OR: [
      { user: { username: { contains: normalized, mode: "insensitive" as const } } },
      { user: { email: { contains: normalized, mode: "insensitive" as const } } },
      { user: { profile: { displayName: { contains: normalized, mode: "insensitive" as const } } } },
    ],
  };
}

export async function listAdminWalletActivity(limit = 100, userQuery?: string): Promise<AdminWalletActivityRow[]> {
  const walletLedger = (prisma as typeof prisma & {
    walletLedger: {
      findMany: (args: object) => Promise<AdminWalletActivityRow[]>;
      count: () => Promise<number>;
    };
  }).walletLedger;
  const where = getAdminUserFilter(userQuery);

  return walletLedger.findMany({
    ...(where ? { where } : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: {
      id: true,
      kind: true,
      eurodollarsDelta: true,
      reputationDelta: true,
      createdAt: true,
      user: {
        select: {
          username: true,
          profile: { select: { displayName: true } },
        },
      },
    },
  });
}

export async function listAdminShopAcquisitions(limit = 100, userQuery?: string): Promise<AdminShopAcquisitionRow[]> {
  const where = getAdminUserFilter(userQuery);

  return prisma.inventoryItem.findMany({
    ...(where ? { where } : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: {
      id: true,
      createdAt: true,
      item: {
        select: {
          id: true,
          slug: true,
          title: true,
          category: true,
          priceEurodollars: true,
        },
      },
      user: {
        select: {
          username: true,
          profile: { select: { displayName: true } },
        },
      },
    },
  }) as Promise<AdminShopAcquisitionRow[]>;
}

export async function searchAdminUsers(query: string, limit = 8): Promise<AdminUserLookupRow[]> {
  const normalized = query.trim().replace(/^@/, "");
  if (normalized.length < 2) {
    return [];
  }

  return prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: normalized, mode: "insensitive" } },
        { email: { contains: normalized, mode: "insensitive" } },
        { profile: { displayName: { contains: normalized, mode: "insensitive" } } },
      ],
    },
    orderBy: [{ username: "asc" }],
    take: limit,
    select: {
      id: true,
      username: true,
      email: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });
}

export async function adjustUserWalletForAdmin(input: {
  username: string;
  eurodollarsDelta?: number;
  reputationDelta?: number;
  actorUserId?: string;
}) {
  const username = input.username.trim().replace(/^@/, "");
  if (!username) {
    throw Object.assign(new Error("username_required"), { status: 400 });
  }

  const eurodollarsDelta = Math.trunc(input.eurodollarsDelta ?? 0);
  const reputationDelta = Math.trunc(input.reputationDelta ?? 0);

  if (eurodollarsDelta === 0 && reputationDelta === 0) {
    throw Object.assign(new Error("delta_required"), { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      profile: { select: { displayName: true } },
    },
  });
  if (!user) {
    throw Object.assign(new Error("user_not_found"), { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.wallet.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
      select: {
        eurodollars: true,
        reputationTotal: true,
      },
    });

    const nextEurodollars = Math.max(0, current.eurodollars + eurodollarsDelta);
    const nextReputation = Math.max(0, current.reputationTotal + reputationDelta);

    const updated = await tx.wallet.update({
      where: { userId: user.id },
      data: {
        eurodollars: nextEurodollars,
        reputationTotal: nextReputation,
      },
      select: {
        eurodollars: true,
        reputationTotal: true,
      },
    });

    await recordWalletLedgerTx(tx, {
      userId: user.id,
      actorUserId: input.actorUserId ?? null,
      kind: "admin.wallet_adjustment",
      eurodollarsDelta,
      reputationDelta,
      balanceEurodollars: updated.eurodollars,
      balanceReputationTotal: updated.reputationTotal,
    });

    return {
      before: current,
      after: updated,
    };
  });

  return {
    user,
    ...result,
  };
}
