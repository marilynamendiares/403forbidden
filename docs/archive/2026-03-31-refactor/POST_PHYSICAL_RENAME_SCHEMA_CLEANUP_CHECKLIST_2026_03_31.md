# Post Physical Rename Schema Cleanup Checklist

Дата: `2026-03-31`

## Назначение

Этот документ применяется сразу после physical SQL rename wave.

Цель:

- убрать больше не нужные `@@map("Book*")` и `@map("bookId")`;
- убрать transitional raw SQL fallback на legacy physical names;
- зафиксировать, что data layer тоже окончательно перешёл на `Arc`.

## Preconditions

Перед этим этапом должно быть true:

- manual SQL draft из
  [20260331193000_physical_sql_book_to_arc_rename.sql](/Users/inokentykonovalov/projects/personal/403forbidden/prisma/manual_sql_drafts/20260331193000_physical_sql_book_to_arc_rename.sql)
  уже реально применён к БД;
- search/runtime smoke-check после physical rename уже проходит;
- `.next` и generated artifacts можно безопасно пересобрать.

## Prisma Schema Cleanup

В [prisma/schema.prisma](/Users/inokentykonovalov/projects/personal/403forbidden/prisma/schema.prisma) должны быть удалены:

### Enum maps

- `ArcStatus @@map("BookStatus")`
- `ArcType @@map("BookType")`
- `ArcFormat @@map("BookFormat")`
- `ArcJoinPolicy @@map("BookJoinPolicy")`
- `ArcVisibility @@map("BookVisibility")`
- `ArcSearchVisibility @@map("BookSearchVisibility")`

### Model maps

- `Arc @@map("Book")`
- `ArcTag @@map("BookTag")`
- `ArcFollow @@map("BookFollow")`
- `ArcMetrics @@map("BookMetrics")`
- `ArcSearchDocument @@map("BookSearchDocument")`
- `ArcReadState @@map("BookReadState")`

### Field maps

- `Chapter.arcId @map("bookId")`
- `ArcTag.arcId @map("bookId")`
- `Follow.arcId @map("bookId")`
- `Collaborator.arcId @map("bookId")`
- `TurnQueue.arcId @map("bookId")`
- `ArcFollow.arcId @map("bookId")`
- `ArcMetrics.arcId @map("bookId")`
- `ArcSearchDocument.arcId @map("bookId")`
- `ArcReadState.arcId @map("bookId")`

## Raw SQL Cleanup

После physical rename больше не нужен legacy fallback в:

- [src/server/repos/arcsSearch.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/arcsSearch.ts)

Нужно сделать:

- удалить `LEGACY_SQL_NAMES`
- удалить fallback вызов `searchArcsByPhysicalNames(..., LEGACY_SQL_NAMES)`
- оставить только `Arc*` physical names

## Discovery Compatibility Cleanup

В [src/server/arcs/discoveryCompat.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/arcs/discoveryCompat.ts):

- `BookMetrics`
- `BookSearchDocument`
- `BookReadState`

должны перестать учитываться как expected names.

После полной стабилизации там должны остаться только `Arc*` physical names и truly-generic fallback checks.

## Generated Artifacts

После schema cleanup:

1. `pnpm prisma generate`
2. удалить stale `.next`
3. `pnpm exec tsc --noEmit --pretty false`
4. targeted `eslint`

## Verification

Проверить руками:

- `/arcs`
- `/arcs/search`
- `/arcs/[slug]`
- `/arcs/[slug]/[index]`
- create arc
- create chapter
- publish chapter
- create post
- follow arc
- read-state
- notifications

## Exit Condition

Этап считается завершённым, когда:

- `schema.prisma` больше не содержит `@@map("Book*")` и `@map("bookId")`;
- active `src` больше не содержит legacy `Book*` physical fallback, кроме historical docs/migrations;
- generated Prisma client собирается без переходных костылей;
- runtime smoke-check проходит.
