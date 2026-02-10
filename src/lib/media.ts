// src/lib/media.ts

/**
 * В БД хотим хранить ТОЛЬКО key:
 *   avatars/.../file.jpg
 *   banners/.../file.jpg
 *
 * Но в легаси может лежать:
 * - "https:/pub-xxx.r2.dev/avatars/..." (битая схема)
 * - "https://pub-xxx.r2.dev/avatars/..."
 * - "/api/uploads/images?key=avatars/..."
 * - "/avatars/..." (редко)
 *
 * resolveMediaUrl() должен стабильно вернуть:
 *   /api/uploads/images?key=<key>
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
  } catch {
    // not absolute
  }

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

  // ✅ если уже прокси-url — вытаскиваем key и возвращаем key
  const fromProxy = tryExtractKeyFromProxyUrl(s1);
  if (fromProxy) return fromProxy;

  // ✅ если уже key ("avatars/...") — возвращаем как есть
  if (!s1.includes("://") && !s1.startsWith("/")) return s1;

  // ✅ если "/avatars/..." — это почти key, просто убираем ведущие /
  if (s1.startsWith("/")) return s1.replace(/^\/+/, "");

  // ✅ абсолютный URL — берём pathname как key
  try {
    const u = new URL(s1);
    return u.pathname.replace(/^\/+/, "");
  } catch {
    // fallback: лучше вернуть что есть, чем падать
    return s1;
  }
}

export function resolveMediaUrl(input?: string | null): string | null {
  const key = coerceMediaKey(input);
  if (!key) return null;
  return `${PROXY_PREFIX}?key=${encodeURIComponent(key)}`;
}
