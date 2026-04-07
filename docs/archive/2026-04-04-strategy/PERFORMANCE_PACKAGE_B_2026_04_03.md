# Performance Package B

**Date:** 2026-04-03  
**Status:** active implementation package  
**Purpose:** перейти от “убрали лишние запросы” к улучшению perceived speed и цельности hot paths.

---

## 1. Package B Items

## B1. Chapter Immediate Local Append

### Current Problem

`ChapterComposer` получает успешный ответ от API, но после этого просто очищает редактор и ждёт SSE, чтобы новый пост появился в ленте.

### Target

Использовать уже возвращённый `post` DTO для мгновенного локального добавления в текущий feed.

### Why It Matters

Chapter page — core gameplay surface.  
Пользователь должен видеть результат своего постинга сразу, а не через второй цикл подтверждения.

---

## B2. Forum New-Post Perceived Speed

### Current Problem

Forum thread сейчас на `thread:new_post` всегда делает tail-fetch.

### Target

Оценить переход к `optimistic append + canonical repair`, не ломая текущую consistency-модель.

---

## B3. Discovery Composition Cost Review

### Current Problem

`getArcsDiscovery` остаётся дорогим composed read для первого открытия archive screen.

### Target

Пересмотреть, какие секции обязаны быть всегда SSR-first, а какие могут быть дешевле или ленивее.

