# 403FORBIDDEN — Book To Arc Eradication Plan

**Date:** 2026-03-31  
**Status:** active working plan  
**Purpose:** разложить полное удаление `book/books` на безопасные пакеты, чтобы не смешать product naming cleanup с опасной schema/data migration.

---

## 1. Goal

Цель плана:

- убрать `book/books` из продуктового и application-layer языка;
- минимизировать legacy naming drift;
- отдельно подготовить тяжёлый data-model пакет, не ломая текущую систему одним массовым rename.

---

## 2. Buckets

### 2.1. Safe

Можно менять без пересборки data-model:

- UI copy;
- компонентные имена;
- локальные prop names;
- комментарии;
- docs;
- event labels и aliases в application-layer;
- helper/service aliases.

### 2.2. Medium

Требует контроля совместимости:

- payload keys вроде `bookSlug`, `bookTitle`, `bookId`;
- server contract names;
- legacy API route comments and wrappers;
- lock resource naming;
- realtime event naming.

### 2.3. Dangerous

Нужно выносить в отдельный migration package:

- Prisma model `Book`;
- enum names `BookStatus`, `BookFormat`, `BookVisibility`, etc.;
- relation names `bookId`, `books`, `BookFollow`, `BookMetrics`, `BookSearchDocument`, `BookReadState`;
- SQL indexes and generated Prisma artifacts;
- data migrations and compatibility with existing DB state.

---

## 3. Current Decision

Текущая стратегия:

1. добить `Safe` слой полностью;
2. затем пройти `Medium` слой с intentional aliases;
3. только после этого проектировать отдельный `Dangerous` migration package.

Это означает:

- сейчас можно aggressively чистить application-layer;
- но нельзя без подготовки переименовывать Prisma schema и DB objects прямо в рабочем ходе рефакторинга.

---

## 4. Current Legacy Boundaries

На текущем этапе допустимыми legacy boundaries считаются:

- `/api/books/*` как compatibility alias поверх `/api/arcs/*`;
- `FollowBookButton` как alias к `FollowArcButton`;
- Prisma `Book*` naming в schema/data layer;
- discovery/read-state tables с `Book*` именами;
- payload keys `bookId`, `bookSlug`, `bookTitle`, пока они ещё нужны для совместимости.

---

## 5. Immediate Next Targets

Следующие safe/medium cleanup targets:

- `BooksLiveClient` -> `ArcsLiveClient`;
- landing/profile placeholder copy;
- `book:*` realtime event aliases и documentation around them;
- `bookSlug` / `bookId` в активном application-layer там, где это уже не DB-bound field;
- docs, которые ещё описывают `books` как живой product term.

---

## 6. Deferred Until Dedicated Migration

Не трогаем до отдельного migration package:

- `prisma/schema.prisma` model rename `Book -> Arc`;
- enum rename `BookStatus -> ArcStatus` and similar;
- generated Prisma client artifacts;
- DB table / constraint / index renames;
- массовый rename `bookId` in relational storage layer.
