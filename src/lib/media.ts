// src/lib/media.ts

/**
 * В БД храним ТОЛЬКО key:
 *   avatars/.../file.jpg
 *   banners/.../file.jpg
 *
 * На клиенте и на сервере всегда строим src одинаково:
 *   /api/uploads/images?key=...
 */

export function coerceMediaKey(input?: string | null): string | null {
  const s0 = (input ?? "").trim();
  if (!s0) return null;

  // чинит legacy "https:/..." -> "https://..."
  const s1 = s0
    .replace(/^https:\/(?!\/)/i, "https://")
    .replace(/^http:\/(?!\/)/i, "http://");

  // если уже key
  if (!s1.includes("://") && !s1.startsWith("/")) return s1;

  // если корневой относительный путь: "/avatars/.."
  if (s1.startsWith("/")) return s1.replace(/^\/+/, "");

  // если абсолютный URL — берём pathname как key
  try {
    const u = new URL(s1);
    return u.pathname.replace(/^\/+/, "");
  } catch {
    // если не парсится — считаем что это key как есть (лучше не падать)
    return s1;
  }
}

export function resolveMediaUrl(input?: string | null): string | null {
  const key = coerceMediaKey(input);
  if (!key) return null;
  return `/api/uploads/images?key=${encodeURIComponent(key)}`;
}
