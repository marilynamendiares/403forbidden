// src/server/render/sanitizeHtml.ts

/**
 * БАЗОВЫЙ серверный sanitizer для HTML.
 *
 * Это не идеальный HTML-парсер, но:
 *  - выкидывает <script> и <style>
 *  - убирает on* handler'ы (onclick, onload, …)
 *  - чистит javascript: в href/src
 *
 * Позже можно будет заменить на полноценную библиотеку
 * (например, sanitize-html), не меняя интерфейс этой функции.
 */
export function sanitizeHtml(input: string): string {
  if (!input) return "";

  let html = input;

  // 1) Убираем <script> и <style> целиком
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<style[\s\S]*?<\/style>/gi, "");

  // 2) Убираем on*="..." / on*='...' / on*=... атрибуты
  html = html.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  html = html.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
  html = html.replace(/\son\w+\s*=\s*[^\s>]+/gi, "");

  // 3) Убираем javascript: из href/src
  html = html.replace(
    /(href|src)\s*=\s*"javascript:[^"]*"/gi,
    "$1=\"#\""
  );
  html = html.replace(
    /(href|src)\s*=\s*'javascript:[^']*'/gi,
    "$1=\"#\""
  );
  html = html.replace(
    /(href|src)\s*=\s*javascript:[^\s>]+/gi,
    "$1=\"#\""
  );

  // 4) Можно добавить доп. фильтры (style= и т.п.) при необходимости

  return html.trim();
}
