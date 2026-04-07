export const FORUM_DISCUSSION_SLUGS = new Set([
  "welcome",
  "support",
  "offtopic",
  "player-hub",
]);

export const ORDERED_FORUM_SLUGS = [
  "welcome",
  "offtopic",
  "player-hub",
  "support",
] as const;

export type CreateThreadVisibility = "PUBLIC" | "MEMBERS" | "PLAYERS" | "ADMIN";

export function canCreateThreadInCategory(input: {
  isAdmin: boolean;
  isPlayer: boolean;
  userId: string | null;
  visibility: CreateThreadVisibility;
}) {
  const { isAdmin, isPlayer, userId, visibility } = input;

  if (isAdmin) return true;
  if (!userId) return false;
  if (visibility === "PUBLIC" || visibility === "MEMBERS") return true;
  if (visibility === "PLAYERS") return isPlayer;
  return false;
}

export function getCreateThreadHint(input: {
  userId: string | null;
  isPlayer: boolean;
  visibility: CreateThreadVisibility;
}) {
  const { userId, isPlayer, visibility } = input;

  if (!userId) return "Sign in to create threads.";
  if (visibility === "ADMIN") return "Only admins can create threads here.";
  if (visibility === "PLAYERS" && !isPlayer) {
    return "Create threads is available after character approval.";
  }
  return "You can't create threads here.";
}

export function sortForumSlugs<T extends { slug: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const ai = ORDERED_FORUM_SLUGS.indexOf(a.slug as (typeof ORDERED_FORUM_SLUGS)[number]);
    const bi = ORDERED_FORUM_SLUGS.indexOf(b.slug as (typeof ORDERED_FORUM_SLUGS)[number]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}
