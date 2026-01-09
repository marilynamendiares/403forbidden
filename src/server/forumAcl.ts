// src/server/forumAcl.ts
// Forum ACL v1 (MVP policy-by-slug)
// Later: replace these Sets with DB flags without changing route code.

export function normalizeSlug(input: string) {
  return (input ?? "").trim().toLowerCase();
}

/**
 * Restricted users (logged-in, but NOT player) can POST only in these categories.
 * NOTE: This does NOT grant "create thread". Thread creation is gated elsewhere (player-only).
 */
export const RESTRICTED_CAN_POST_CATEGORIES = new Set<string>([
  "welcome",   // guestbook / onboarding
  "offtopic",  // lounge
  "support",   // support / feedback
]);

export function restrictedCanPost(categorySlug: string) {
  return RESTRICTED_CAN_POST_CATEGORIES.has(normalizeSlug(categorySlug));
}

/**
 * Categories where only admins can create threads and posts.
 * Use this for: announcements, lore, rules.
 *
 * If later you want "announcements visible to players only",
 * prefer a second category slug (e.g. announcements-players) for MVP,
 * or migrate to DB visibility flag.
 */
export const ADMIN_ONLY_CATEGORIES = new Set<string>([
  "announcements",
  "announcements-players",
  "lore",
  "rules",
]);

export function isAdminOnlyCategory(categorySlug: string) {
  return ADMIN_ONLY_CATEGORIES.has(normalizeSlug(categorySlug));
}

/**
 * Player-only read/write zones (optional to enforce now; useful for future GET guards / UI).
 * Not enforced in current routes yet (we enforce on POST for now).
 */
export const PLAYER_ONLY_CATEGORIES = new Set<string>([
  "player-hub",
]);

export function isPlayerOnlyCategory(categorySlug: string) {
  return PLAYER_ONLY_CATEGORIES.has(normalizeSlug(categorySlug));
}
