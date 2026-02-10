// src/lib/media.ts
export function resolveMediaUrl(v?: string | null) {
  let s = (v ?? "").trim();
  if (!s) return null;

  // 🔧 fix common broken scheme: "https:/..." -> "https://..."
  if (s.startsWith("https:/") && !s.startsWith("https://")) {
    s = s.replace(/^https:\//, "https://");
  }
  if (s.startsWith("http:/") && !s.startsWith("http://")) {
    s = s.replace(/^http:\//, "http://");
  }

  // already absolute
  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  // site-local path
  if (s.startsWith("/")) return s;

  // if someone saved host without scheme (rare but possible)
  if (s.includes(".r2.dev/") || s.includes(".cloudflarestorage.com/")) {
    return `https://${s}`;
  }

  // otherwise treat as key for our proxy route (future-proof)
  return `/api/uploads/images?key=${encodeURIComponent(s)}`;
}
