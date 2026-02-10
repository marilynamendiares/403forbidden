export function resolveMediaUrl(v?: string | null) {
  let s = (v ?? "").trim();
  if (!s) return null;

  // ⚠️ СНАЧАЛА pub-
  if (s.startsWith("/pub-")) return `https://${s.slice(1)}`;

  if (s.startsWith("/https://") || s.startsWith("/http://")) s = s.slice(1);

  if (s.startsWith("https:/") && !s.startsWith("https://")) {
    s = "https://" + s.slice("https:/".length);
  }
  if (s.startsWith("http:/") && !s.startsWith("http://")) {
    s = "http://" + s.slice("http:/".length);
  }

  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return s;

  return `/api/uploads/images?key=${encodeURIComponent(s)}`;
}
