export function resolveMediaUrl(v?: string | null) {
  let s = (v ?? "").trim();
  if (!s) return null;

  // normalize accidental leading slash for absolute-ish urls
  // "/https://..." or "/http://..."
  if (s.startsWith("/https://")) s = s.slice(1);
  if (s.startsWith("/http://")) s = s.slice(1);

  // normalize broken scheme "https:/example.com" -> "https://example.com"
  if (s.startsWith("https:/") && !s.startsWith("https://")) {
    s = "https://" + s.slice("https:/".length);
  }
  if (s.startsWith("http:/") && !s.startsWith("http://")) {
    s = "http://" + s.slice("http:/".length);
  }

  // normalize "/pub-xxx.r2.dev/..." -> "https://pub-xxx.r2.dev/..."
  if (s.startsWith("/pub-")) s = "https://" + s.slice(1);

  // normalize "pub-xxx.r2.dev/..." -> "https://pub-xxx.r2.dev/..."
  if (s.startsWith("pub-") || s.includes(".r2.dev/")) {
    if (!s.startsWith("http://") && !s.startsWith("https://")) {
      s = "https://" + s.replace(/^\/+/, "");
    }
  }

  // already absolute
  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  // local assets
  if (s.startsWith("/")) return s;

  // treat as key -> proxy route
  return `/api/uploads/images?key=${encodeURIComponent(s)}`;
}
