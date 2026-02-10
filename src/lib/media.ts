export function resolveMediaUrl(v?: string | null) {
  const s = (v ?? "").trim();
  if (!s) return null;

  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return s;

  return `/api/uploads/images?key=${encodeURIComponent(s)}`;
}
