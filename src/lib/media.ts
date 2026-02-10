export function resolveMediaUrl(v?: string | null) {
  const s = (v ?? "").trim();
  if (!s) return null;

  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  // r2.dev host without scheme
  if (/^[a-z0-9-]+\.r2\.dev\//i.test(s)) return `https://${s}`;

  if (s.startsWith("/")) return s;

  // treat as key
  return `/api/uploads/images?key=${encodeURIComponent(s)}`;
}
