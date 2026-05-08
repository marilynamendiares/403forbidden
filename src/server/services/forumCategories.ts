import { prisma } from "@/server/db";
import { getCategories } from "@/server/repos/forum";
import { isPlayer } from "@/server/player";
import { randomSlugSuffix } from "@/server/random";
import { isUniqueConstraintError } from "@/server/prismaErrors";
import {
  canCreateThreadInCategory,
  getCreateThreadHint,
  type CreateThreadVisibility,
} from "@/server/forumPresentation";

export type ForumCategoryTier = "GUEST" | "RESTRICTED" | "PLAYER" | "ADMIN";

type CategorySeedInput = {
  slug: string;
  title: string;
  desc: string;
  readVisibility: "PUBLIC" | "MEMBERS" | "PLAYERS";
  createThreadVisibility: "ADMIN" | "PLAYERS" | "MEMBERS";
  createPostVisibility: "ADMIN" | "PLAYERS" | "MEMBERS";
};

const DEFAULT_FORUM_CATEGORIES = [
  {
    slug: "announcements",
    title: "Announcements (Public)",
    desc: "Project news & updates",
    readVisibility: "PUBLIC",
    createThreadVisibility: "ADMIN",
    createPostVisibility: "ADMIN",
  },
  {
    slug: "lore",
    title: "Lore / World / Map",
    desc: "World-building, canon, meta",
    readVisibility: "PUBLIC",
    createThreadVisibility: "ADMIN",
    createPostVisibility: "ADMIN",
  },
  {
    slug: "offtopic",
    title: "offtopic",
    desc: "Anything else",
    readVisibility: "MEMBERS",
    createThreadVisibility: "PLAYERS",
    createPostVisibility: "MEMBERS",
  },
] satisfies CategorySeedInput[];

export async function ensureDefaultForumCategories() {
  const count = await prisma.forumCategory.count();
  if (count > 0) return;

  await prisma.forumCategory.createMany({
    data: DEFAULT_FORUM_CATEGORIES,
    skipDuplicates: true,
  });
}

export async function getForumCategoryTier(input: {
  userId: string | null;
  isAdmin: boolean;
}) {
  if (input.isAdmin) return "ADMIN" as const;
  if (!input.userId) return "GUEST" as const;

  const player = await isPlayer(input.userId);
  return player ? ("PLAYER" as const) : ("RESTRICTED" as const);
}

export async function listVisibleForumCategories(input: {
  userId: string | null;
  isAdmin: boolean;
}) {
  await ensureDefaultForumCategories();
  const tier = await getForumCategoryTier(input);
  const categories = await getCategories();

  const visible = categories.filter((category) => {
    const visibility = category.readVisibility ?? "MEMBERS";
    if (tier === "ADMIN") return true;
    if (visibility === "PUBLIC") return true;
    if (visibility === "MEMBERS") {
      return tier === "RESTRICTED" || tier === "PLAYER";
    }
    if (visibility === "PLAYERS") {
      return tier === "PLAYER";
    }
    return false;
  });

  return { tier, categories: visible };
}

export function canReadForumCategory(input: {
  tier: ForumCategoryTier;
  readVisibility: "PUBLIC" | "MEMBERS" | "PLAYERS";
}) {
  if (input.tier === "ADMIN") return true;
  if (input.readVisibility === "PUBLIC") return true;
  if (input.readVisibility === "MEMBERS") {
    return input.tier === "RESTRICTED" || input.tier === "PLAYER";
  }
  if (input.readVisibility === "PLAYERS") {
    return input.tier === "PLAYER";
  }
  return false;
}

export function getForumCategoryAccessCopy(input: {
  userId: string | null;
  readVisibility: "PUBLIC" | "MEMBERS" | "PLAYERS";
}) {
  if (input.readVisibility === "PUBLIC") {
    return {
      label: "public",
      title: "Public channel",
      description: "This area is visible from the outer layer.",
      actionHref: null,
      actionLabel: null,
    };
  }

  if (input.readVisibility === "MEMBERS") {
    return {
      label: "members only",
      title: "Members only",
      description: "Sign in to enter this forum category.",
      actionHref: "/login?next=/forum",
      actionLabel: "Log in",
    };
  }

  return {
    label: "approved characters only",
    title: "Approved characters only",
    description: input.userId
      ? "Create and approve your character to enter this forum category."
      : "Log in and create an approved character to enter this forum category.",
    actionHref: input.userId ? "/characters" : "/login?next=/forum",
    actionLabel: input.userId ? "Create your character" : "Log in",
  };
}

export async function listForumCategoriesWithAccess(input: {
  userId: string | null;
  isAdmin: boolean;
}) {
  await ensureDefaultForumCategories();
  const tier = await getForumCategoryTier(input);
  const categories = await getCategories();

  const categoriesWithAccess = categories.map((category) => {
    const readVisibility = (category.readVisibility ?? "MEMBERS") as
      | "PUBLIC"
      | "MEMBERS"
      | "PLAYERS";
    const access = getForumCategoryAccessCopy({
      userId: input.userId,
      readVisibility,
    });

    return {
      ...category,
      readVisibility,
      canRead: canReadForumCategory({ tier, readVisibility }),
      accessLabel: access.label,
      accessTitle: access.title,
      accessDescription: access.description,
      accessActionHref: access.actionHref,
      accessActionLabel: access.actionLabel,
    };
  });

  const latestThreads = await Promise.all(
    categoriesWithAccess
      .filter((category) => category.canRead)
      .map(async (category) => {
        const latestThread = await prisma.forumThread.findFirst({
          where: {
            categoryId: category.id,
            deletedAt: null,
            ...(input.isAdmin ? {} : { hiddenAt: null }),
          },
          orderBy: [{ lastActivityAt: "desc" }, { updatedAt: "desc" }],
          select: {
            slug: true,
            title: true,
            lastActivityAt: true,
            hiddenAt: true,
          },
        });

        return [category.id, latestThread] as const;
      })
  );

  const latestThreadByCategoryId = new Map(latestThreads);

  return {
    tier,
    categories: categoriesWithAccess.map((category) => ({
      ...category,
      latestThread: latestThreadByCategoryId.get(category.id) ?? null,
    })),
  };
}

export async function createForumCategory(input: {
  title: string;
  desc?: string;
}) {
  const { title, desc = "" } = input;
  const base = (title || "category")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  let slug = base || "category";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.forumCategory.create({
        data: { slug, title, desc },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
      slug = `${base}-${randomSlugSuffix(4)}`;
    }
  }

  throw new Error("Cannot create category");
}

export async function getForumCategoryCreateStateForViewer(input: {
  categorySlug: string;
  userId: string | null;
  isAdmin: boolean;
}) {
  const category = await prisma.forumCategory.findUnique({
    where: { slug: input.categorySlug },
    select: { createThreadVisibility: true },
  });

  const visibility = (category?.createThreadVisibility ?? "PLAYERS") as CreateThreadVisibility;
  const player = input.userId ? await isPlayer(input.userId) : false;

  return {
    visibility,
    canCreateThread: canCreateThreadInCategory({
      isAdmin: input.isAdmin,
      isPlayer: player,
      userId: input.userId,
      visibility,
    }),
    createHint: getCreateThreadHint({
      userId: input.userId,
      isPlayer: player,
      visibility,
    }),
  };
}
