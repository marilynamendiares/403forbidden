// src/lib/media.ts

/**
 * Канон:
 * - В БД/DTO/Session храним ТОЛЬКО key:
 *     avatars/.../file.jpg
 *     banners/.../file.jpg
 * - В UI всегда строим URL через один прокси:
 *     /api/uploads/images?key=<key>
 *
 * Легаси входы допускаем, но нормализуем в key.
 */

const PROXY_PREFIX = "/api/uploads/images";

function fixBrokenScheme(s: string) {
  return s
    .replace(/^https:\/(?!\/)/i, "https://")
    .replace(/^http:\/(?!\/)/i, "http://");
}

function tryExtractKeyFromProxyUrl(input: string): string | null {
  // 1) абсолютный URL
  try {
    const u = new URL(input);
    if (u.pathname === PROXY_PREFIX) {
      const key = u.searchParams.get("key");
      return key ? key.trim() : null;
    }
  } catch {}

  // 2) относительный URL ("/api/uploads/images?key=...")
  if (input.startsWith(PROXY_PREFIX)) {
    try {
      const u = new URL(input, "http://local");
      const key = u.searchParams.get("key");
      return key ? key.trim() : null;
    } catch {
      return null;
    }
  }

  return null;
}

export function coerceMediaKey(input?: string | null): string | null {
  const s0 = (input ?? "").trim();
  if (!s0) return null;

  const s1 = fixBrokenScheme(s0);

  // если уже прокси-url — вытаскиваем key
  const fromProxy = tryExtractKeyFromProxyUrl(s1);
  if (fromProxy) return fromProxy;

  // если это raw key
  if (!s1.includes("://") && !s1.startsWith("/")) return s1;

  // если "/avatars/..." или "/banners/..." — убираем ведущие /
  if (s1.startsWith("/")) return s1.replace(/^\/+/, "");

  // абсолютный URL — берём pathname как key
  try {
    const u = new URL(s1);
    return u.pathname.replace(/^\/+/, "");
  } catch {
    return null;
  }
}

export function resolveMediaUrl(input?: string | null): string | null {
  const key = coerceMediaKey(input);
  if (!key) return null;
  return `${PROXY_PREFIX}?key=${encodeURIComponent(key)}`;
}
