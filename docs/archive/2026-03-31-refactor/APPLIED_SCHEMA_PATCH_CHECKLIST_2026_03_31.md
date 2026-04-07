# Applied Schema Patch Checklist

Дата: `2026-03-31`

## Назначение

Этот документ нужен для первого реального Prisma schema patch пакета.

Он отвечает не на вопрос `что в идеале должно быть`, а на вопрос:

`что именно нужно проверить и починить сразу после applied schema patch, чтобы проект не остался в half-state`

## Current Status

Уже применено:

- [x] `Stage 1A`: Prisma enum rename на уровне schema API
- [x] `BookStatus -> ArcStatus`
- [x] `BookType -> ArcType`
- [x] `BookFormat -> ArcFormat`
- [x] `BookJoinPolicy -> ArcJoinPolicy`
- [x] `BookVisibility -> ArcVisibility`
- [x] `BookSearchVisibility -> ArcSearchVisibility`
- [x] сохранить старые DB enum names через `@@map(...)`
- [x] regenerate Prisma client после enum-патча
- [x] обновить active runtime imports на `Arc*` enums

Ещё НЕ применено:

- [x] `Book -> Arc`
- [x] `bookId -> arcId`
- [x] `Book*` support models -> `Arc*`
- [x] relation/backref rename (`books`, `bookReadStates`, `BookFollow`)

## Scope первого applied patch

Первый applied patch должен решать только Prisma/schema-client surface:

- rename Prisma models to `Arc*`
- rename Prisma fields to `arcId`
- использовать `@@map/@map` там, где это снижает риск
- regenerate Prisma client
- устранить TypeScript compile surface

Первый applied patch НЕ должен:

- физически переименовывать SQL tables;
- физически переименовывать historical migration files;
- чистить документацию или unrelated naming.

## Pre-Flight Checklist

Перед applied patch:

- [ ] проверить, что `ARC_SCHEMA_TARGET_V1` актуален
- [ ] проверить, что `LEGACY_ALIAS_AUDIT` актуален
- [ ] не смешивать этот пакет с feature work
- [ ] зафиксировать dirty worktree awareness
- [ ] не трогать generated prisma client вручную до обновления schema

## Prisma Schema Blocks To Change

### Enums

- [x] `BookStatus -> ArcStatus`
- [x] `BookType -> ArcType`
- [x] `BookFormat -> ArcFormat`
- [x] `BookJoinPolicy -> ArcJoinPolicy`
- [x] `BookVisibility -> ArcVisibility`
- [x] `BookSearchVisibility -> ArcSearchVisibility`

### Models

- [x] `Book -> Arc`
- [x] `BookTag -> ArcTag`
- [x] `BookFollow -> ArcFollow`
- [x] `BookMetrics -> ArcMetrics`
- [x] `BookSearchDocument -> ArcSearchDocument`
- [x] `BookReadState -> ArcReadState`

### Key relation fields

- [x] `Chapter.bookId -> Chapter.arcId`
- [x] `Follow.bookId -> Follow.arcId`
- [x] `Collaborator.bookId -> Collaborator.arcId`
- [x] `TurnQueue.bookId -> TurnQueue.arcId`
- [x] `ArcTag.bookId -> ArcTag.arcId`
- [x] `ArcFollow.bookId -> ArcFollow.arcId`
- [x] `ArcMetrics.bookId -> ArcMetrics.arcId`
- [x] `ArcSearchDocument.bookId -> ArcSearchDocument.arcId`
- [x] `ArcReadState.bookId -> ArcReadState.arcId`

### User backrefs

- [x] `User.books -> User.arcs`
- [x] `User.BookFollow -> User.arcFollows`
- [x] `User.bookReadStates -> User.arcReadStates`

## Files Expected To Break After Prisma Regenerate

### Arc selects / payload typing

- [ ] [src/server/arcs/arcSelects.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/arcs/arcSelects.ts)
  Current risk: `Prisma.BookSelect`, `Prisma.BookGetPayload`

### Catalog / discovery / search

- [ ] [src/server/repos/arcsCatalog.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/arcsCatalog.ts)
  Current risk: `BookFormat`, `BookStatus`, `BookVisibility`, `BookSearchVisibility`, `Prisma.BookOrderByWithRelationInput`
- [ ] [src/server/repos/arcsSearch.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/arcsSearch.ts)
  Current risk: raw SQL and enum casts still reference `"Book*"`
- [ ] [src/server/repos/arcsDiscovery.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/arcsDiscovery.ts)
  Current risk: `bookReadState` and relation names

### Access / viewer context / read state

- [ ] [src/server/arcs/access.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/arcs/access.ts)
  Current risk: `BookSearchVisibility`, `bookId`
- [ ] [src/server/arcs/viewerContext.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/arcs/viewerContext.ts)
  Current risk: `prisma.book`, `bookId` relation fields
- [ ] [src/server/arcs/readState.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/arcs/readState.ts)
  Current risk: `bookReadState`, composite keys on `bookId`

### API validators

- [ ] [src/app/api/arcs/catalog/route.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/api/arcs/catalog/route.ts)
  Status: enum rename already applied
- [ ] [src/app/api/arcs/search/route.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/api/arcs/search/route.ts)
  Status: enum rename already applied
- [ ] [src/app/api/arcs/read-state/route.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/api/arcs/read-state/route.ts)
  Status: compatibility `bookId` removed

### Services / repos still DB-bound

- [ ] [src/server/services/books.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/services/books.ts)
- [ ] [src/server/services/chapters.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/services/chapters.ts)
- [ ] [src/server/repos/chapters.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/chapters.ts)
- [ ] [src/server/follow.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/follow.ts)
- [ ] [src/server/access.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/access.ts)

## Raw SQL Checklist

These must be inspected after Prisma patch and before declaring the migration healthy:

- [ ] [src/server/repos/arcsSearch.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/arcsSearch.ts)
  - [ ] `"BookStatus"` casts
  - [ ] `"BookFormat"` casts
  - [ ] `"BookVisibility"` casts
  - [ ] `"BookSearchVisibility"` casts
  - [ ] `"BookSearchDocument"`
  - [ ] `"BookMetrics"`
  - [ ] `"bookId"`
  - [ ] `"BookTag"`

## Expected Compile Surface Changes

После regenerate Prisma client ожидаем поломки в следующих типах имен:

- [ ] `Prisma.BookSelect`
- [ ] `Prisma.BookGetPayload`
- [ ] `Prisma.BookOrderByWithRelationInput`
- [x] `BookStatus`
- [x] `BookType`
- [x] `BookFormat`
- [x] `BookJoinPolicy`
- [x] `BookVisibility`
- [x] `BookSearchVisibility`
- [ ] `BookFollow`
- [ ] `BookReadState`

## Compatibility Decisions To Preserve During Patch

Во время первого applied patch нужно сохранить:

- [x] compatibility aliases intentionally not preserved
- [x] `/api/books/*` removed after canonical `/api/arcs/*` route migration
- [x] `book:*` SSE aliases removed
- [x] `bookId/bookSlug/bookTitle` fallback payload keys removed from active runtime
- [x] `refreshDiscoveryForBook*` aliases removed
- [ ] `rebuildBook*` aliases may still remain in DB-bound/support modules
- [x] `upsertBookReadState` alias removed

## Post-Patch Verification

Сразу после schema patch:

- [ ] regenerate Prisma client
- [ ] run targeted lint
- [ ] run targeted type check or build
- [ ] проверить `arcs/catalog`
- [ ] проверить `arcs/search`
- [ ] проверить `arcs/[slug]`
- [ ] проверить `arcs/[slug]/[index]`
- [ ] проверить follow
- [ ] проверить read-state
- [ ] проверить chapter publish/post/like/reputation

## Stop Conditions

Если в applied patch выясняется, что:

- enum rename ломает raw SQL больше, чем ожидалось;
- `@@map/@map` не даёт безопасного промежуточного состояния;
- compile surface слишком широк для одного пакета;

то нужно:

- остановить applied patch на Prisma API surface only;
- не трогать SQL physical rename в том же пакете;
- split the work into a smaller follow-up package.

## Практический вывод

После этого checklist следующий уже не документарный, а инженерный шаг:

- либо начать реальный `Prisma Arc Schema Patch`
- либо сделать ещё один маленький prep-pass по самым очевидным compile hotspots вроде `arcSelects` и `arcsCatalog`, но уже как подготовку к applied patch.
