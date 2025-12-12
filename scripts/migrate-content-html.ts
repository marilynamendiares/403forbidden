// scripts/migrate-content-html.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import sanitizeHtml from "sanitize-html";
import { marked } from "marked";

const prisma = new PrismaClient();

/**
 * Простой helper:
 *  - если строка выглядит как HTML → считаем её HTML
 *  - иначе → считаем markdown и рендерим через marked
 *  - в любом случае → прогоняем через sanitizeHtml
 */
function normalizeToHtml(raw: string): string {
  const text = raw.trim();
  if (!text) return "";

  // очень грубая эвристика: если начинается с тега, считаем, что это HTML
  const looksLikeHtml = /^<\/?[a-z][\s\S]*>/i.test(text);

const html = looksLikeHtml ? text : (marked.parse(text) as string);


  const clean = sanitizeHtml(html, {
    // Базовый белый список. Можно подправить под твой реальный конфиг.
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "del",
      "blockquote",
      "code",
      "pre",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "span",
      "a",
      "img",
      "hr",
      "div",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title"],
      span: ["class"],
      div: ["class"],
      p: ["class"],
      code: ["class"],
      pre: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    // важный момент: режем inline-обработчики
    allowVulnerableTags: false,
    // не позволяем встраивать скрипты/ивенты
    disallowedTagsMode: "discard",
    // можно добавить transformTags, если потом захотим спец-виджеты
  });

  return clean;
}

async function migrateChapters() {
  console.log("=== Migrating Chapter.contentHtml ===");

  const chapters = await prisma.chapter.findMany({
    where: {
      OR: [
        { contentHtml: null },
        { contentHtml: "" as any }, // на всякий случай
      ],
      // есть что мигрировать
      AND: [
        {
          OR: [
            { markdown: { not: null } },
            // если когда-то хранили HTML в content.type === "html"
            // { content: { path: ["type"], equals: "html" } } // если нужно
          ],
        },
      ],
    },
    select: {
      id: true,
      markdown: true,
      contentHtml: true,
    },
    // можно батчами, но первая версия — “всё сразу”, для небольших объёмов
  });

  console.log(`Found ${chapters.length} chapters to process`);

  let updated = 0;

  for (const ch of chapters) {
    const src = (ch.markdown ?? "").trim();
    if (!src) continue;

    const html = normalizeToHtml(src);
    if (!html) continue;

    await prisma.chapter.update({
      where: { id: ch.id },
      data: { contentHtml: html },
    });

    updated++;
    if (updated % 50 === 0) {
      console.log(`  updated ${updated} chapters...`);
    }
  }

  console.log(`Chapters migration done. Updated: ${updated}`);
}

async function migrateChapterPosts() {
  console.log("=== Migrating ChapterPost.contentHtml ===");

  const posts = await prisma.chapterPost.findMany({
    where: {
      OR: [
        // contentHtml IS NULL
        { contentHtml: { equals: null } },
        // или пустая строка (на всякий случай)
        { contentHtml: "" },
      ],
    } as any,
    select: {
      id: true,
      contentMd: true,
    },
  });





  console.log(`Found ${posts.length} chapter posts to process`);

  let updated = 0;

  for (const p of posts) {
    const src = (p.contentMd ?? "").trim();
    if (!src) continue;

    const html = normalizeToHtml(src);
    if (!html) continue;

    await prisma.chapterPost.update({
      where: { id: p.id },
      data: { contentHtml: html },
    });

    updated++;
    if (updated % 100 === 0) {
      console.log(`  updated ${updated} posts...`);
    }
  }

  console.log(`ChapterPost migration done. Updated: ${updated}`);
}


async function main() {
  try {
    await migrateChapters();
    await migrateChapterPosts();
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
