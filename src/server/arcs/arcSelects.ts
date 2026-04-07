import { Prisma } from "@prisma/client";

export const arcCardSelect = Prisma.validator<Prisma.ArcSelect>()({
  id: true,
  slug: true,
  publicSlug: true,
  title: true,
  tagline: true,
  hook: true,
  status: true,
  format: true,
  joinPolicy: true,
  visibility: true,
  allowDiscovery: true,
  updatedAt: true,
  createdAt: true,
  tags: {
    select: {
      tag: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  },
  metrics: {
    select: {
      postsTotal: true,
      posts7d: true,
      likes7d: true,
      rep7d: true,
      followersCount: true,
      heatScore: true,
      lastActivityAt: true,
    },
  },
});

export type ArcCardRow = Prisma.ArcGetPayload<{
  select: typeof arcCardSelect;
}>;
