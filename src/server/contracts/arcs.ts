import { z } from "zod";

export const ArcParticipant = z.object({
  id: z.string(),
  username: z.string().nullable(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export const ArcTag = z.object({
  name: z.string(),
  slug: z.string(),
});

export const ArcCard = z.object({
  id: z.string(),
  slug: z.string(),
  publicSlug: z.string(),
  title: z.string(),
  tagline: z.string().nullable(),
  hook: z.string().nullable(),
  status: z.string(),
  format: z.string(),
  joinPolicy: z.string(),
  visibility: z.string(),
  allowDiscovery: z.boolean(),
  activityBucket: z.enum(["dead", "warm", "hot"]),
  heatScore: z.number(),
  followersCount: z.number(),
  postsTotal: z.number(),
  lastActivityAt: z.string().nullable(),
  updatedAt: z.string(),
  participants: z.array(ArcParticipant),
  tags: z.array(ArcTag),
  continueUrl: z.string().nullable().optional(),
  isFollowing: z.boolean().optional(),
  isParticipant: z.boolean().optional(),
});

export const ArcPage = z.object({
  items: z.array(ArcCard),
  nextCursor: z.string().nullable(),
});

export const ArcsDiscoveryResponse = z.object({
  quickFilters: z.array(z.string()),
  topTrending: z.array(ArcCard),
  newJustStarted: z.array(ArcCard),
  recentlyUpdated: z.array(ArcCard),
  continueReading: z.array(ArcCard),
  underground: z.array(ArcCard),
});

export type ArcParticipantT = z.infer<typeof ArcParticipant>;
export type ArcTagT = z.infer<typeof ArcTag>;
export type ArcCardT = z.infer<typeof ArcCard>;
export type ArcPageT = z.infer<typeof ArcPage>;
export type ArcsDiscoveryResponseT = z.infer<typeof ArcsDiscoveryResponse>;
