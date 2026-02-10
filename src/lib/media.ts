export function normalizeUrl(input?: string | null) {
  const s0 = (input ?? "").trim();
  if (!s0) return null;

  // fix "https:/example.com" -> "https://example.com"
  const s1 = s0
    .replace(/^https:\/(?!\/)/i, "https://")
    .replace(/^http:\/(?!\/)/i, "http://");

  // if someone stored host without scheme: "pub-xxx.r2.dev/..."
if (/^(?:pub-[a-z0-9]+|[a-z0-9-]+)\.r2\.dev(?:\/|$)/i.test(s1)) {
  return `https://${s1}`;
}

  // already absolute
  if (s1.startsWith("http://") || s1.startsWith("https://")) return s1;

  // root-relative
  if (s1.startsWith("/")) return s1;

  // otherwise treat as "key" for proxy endpoint
  return `/api/uploads/images?key=${encodeURIComponent(s1)}`;
}

export function resolveMediaUrl(v?: string | null) {
  return normalizeUrl(v);
}
