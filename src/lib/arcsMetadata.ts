import { slugify } from "@/lib/slug";

export type DiscoveryTagDefinition = {
  slug: string;
  name: string;
  group: "tone" | "genre" | "structure";
};

export const DISCOVERY_TAGS: DiscoveryTagDefinition[] = [
  { slug: "dark", name: "Dark", group: "tone" },
  { slug: "romance", name: "Romance", group: "genre" },
  { slug: "glitch", name: "Glitch", group: "tone" },
  { slug: "mystery", name: "Mystery", group: "genre" },
  { slug: "horror", name: "Horror", group: "genre" },
  { slug: "surreal", name: "Surreal", group: "tone" },
  { slug: "cyberpunk", name: "Cyberpunk", group: "genre" },
  { slug: "fantasy", name: "Fantasy", group: "genre" },
  { slug: "drama", name: "Drama", group: "genre" },
  { slug: "experimental", name: "Experimental", group: "tone" },
  { slug: "solo-focus", name: "Solo Focus", group: "structure" },
  { slug: "duo-dynamic", name: "Duo Dynamic", group: "structure" },
  { slug: "ensemble", name: "Ensemble", group: "structure" },
] as const;

export const DISCOVERY_TAG_GROUP_LABELS: Record<DiscoveryTagDefinition["group"], string> = {
  tone: "Tone",
  genre: "Genre",
  structure: "Structure",
};

const DISCOVERY_TAGS_BY_SLUG = new Map(
  DISCOVERY_TAGS.map((tag) => [tag.slug, tag] as const)
);

export function normalizeDiscoveryTags(values: string[]) {
  const slugs = [...new Set(values.map((value) => slugify(value)).filter(Boolean))];

  return slugs
    .map((slug) => DISCOVERY_TAGS_BY_SLUG.get(slug))
    .filter((tag): tag is DiscoveryTagDefinition => Boolean(tag))
    .slice(0, 8)
    .map((tag) => ({
      slug: tag.slug,
      name: tag.name,
    }));
}

export function isCanonicalDiscoveryTag(slug: string) {
  return DISCOVERY_TAGS_BY_SLUG.has(slug);
}
