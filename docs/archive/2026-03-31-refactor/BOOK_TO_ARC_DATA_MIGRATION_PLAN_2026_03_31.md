# Book To Arc Data Migration Plan

Дата: `2026-03-31`

## Назначение

Этот документ описывает, как переводить data layer проекта с `Book` на `Arc`.

Это уже не naming cleanup.

Это migration program для:

- Prisma schema
- generated client
- raw SQL
- storage service layer
- compatibility payloads
- legacy API/runtime aliases

## Базовый принцип

Миграция должна идти по волнам.

Нельзя:

- смешивать schema rename и произвольный feature work в одном пакете;
- одновременно менять Prisma schema, raw SQL и удалять legacy aliases без промежуточной совместимости;
- делать миграцию “массовым rename по всему проекту”.

## Целевая опора

План опирается на:

- [ARC_SCHEMA_TARGET_V1_2026_03_31.md](/Users/inokentykonovalov/projects/personal/403forbidden/docs/ARC_SCHEMA_TARGET_V1_2026_03_31.md)
- [DB_BOUND_BOOK_RENAME_ASSESSMENT_2026_03_31.md](/Users/inokentykonovalov/projects/personal/403forbidden/docs/DB_BOUND_BOOK_RENAME_ASSESSMENT_2026_03_31.md)
- [BOOK_TO_ARC_ERADICATION_PLAN_2026_03_31.md](/Users/inokentykonovalov/projects/personal/403forbidden/docs/BOOK_TO_ARC_ERADICATION_PLAN_2026_03_31.md)

## Что считаем успехом

Миграция считается завершённой, когда:

- в Prisma schema больше нет `model Book`;
- relation fields больше не используют `bookId` там, где речь об арках;
- discovery/read-state/follow storage layer работают на `Arc*`;
- raw SQL больше не ссылается на `"Book*"` объекты;
- generated Prisma client соответствует новой схеме;
- `/api/books/*` и `book:*` aliases либо удалены, либо оставлены только как явно временный compatibility layer;
- application code больше не зависит от `bookId/bookSlug/bookTitle`, кроме, возможно, строго контролируемого transition boundary.

## Общая стратегия

Миграция делится на 6 волн.

### Wave 0. Pre-Migration Freeze

Цель:

- заморозить расширение data layer вокруг `Book`;
- не плодить новый техдолг перед миграцией.

Что делаем:

- не добавляем новые `book*` поля и таблицы;
- новые фичи в arcs/discovery/read-state либо откладываются, либо пишутся уже с alias-first thinking;
- фиксируем target truth только через `Arc`-терминологию в docs и product layer.

Критерий завершения:

- команда понимает, что `Book` больше не расширяется как канон.

### Wave 1. Alias-First Storage Surface

Цель:

- довести server exports и runtime service API до `arc`-канона без изменения БД.

Что делаем:

- вводим каноничные alias exports для storage services:
  - `refreshDiscoveryForArc`
  - `refreshDiscoveryMetricsForArc`
  - `refreshDiscoverySearchForArc`
  - `refreshDiscoveryContentForArc`
  - `ensureArcFoundation`
  - `rebuildArcMetrics`
  - `rebuildArcSearchDocument`
  - `rebuildArcDiscoveryFoundation`
- `upsertArcReadState` уже есть, аналогично доводим остальные read/discovery helpers;
- все новые вызовы переводим на `arc` exports;
- старые `Book*` exports пока оставляем как alias.

Что не делаем:

- не трогаем Prisma model names;
- не трогаем SQL table names;
- не трогаем migration files.

Критерий завершения:

- application imports уже используют `Arc`-ориентированные exports;
- `Book*` в storage helpers остаётся только как внутренняя совместимость.

### Wave 2. Runtime Contract Transition

Цель:

- вычистить runtime payload/contracts до максимально возможного `arc`-вида до schema migration.

Что делаем:

- переводим payloads на `arcId`, `arcSlug`, `arcTitle` как primary keys;
- `bookId`, `bookSlug`, `bookTitle` остаются только fallback-слоем;
- доводим SSE events до `arc:*` как main channel;
- `/api/arcs/*` окончательно закрепляем как каноничный API;
- `/api/books/*` живёт только как alias boundary.

Критерий завершения:

- все активные клиенты и server-side handlers уже думают в `arc`;
- legacy `book*` payload keys нужны только для backward compatibility.

### Wave 3. Prisma Schema Transition

Цель:

- перевести Prisma schema на новый канон.

Это самый рискованный этап.

Что нужно решить до начала:

- сохраняем ли `ArcType`;
- что делаем с polymorphic `Follow.bookId`;
- будет ли rename через чистую Prisma-модель или через `@@map/@map` совместимость;
- остаются ли какие-то таблицы физически `Book*`, но логически мапятся в `Arc*`.

Предпочтительная стратегия:

- сначала использовать Prisma-level rename через `@@map` и `@map`, если это уменьшает риск для реальной БД;
- только потом, при необходимости, переименовывать физические объекты SQL.

Что делаем:

- `model Book -> model Arc`
- `BookTag -> ArcTag`
- `BookFollow -> ArcFollow`
- `BookMetrics -> ArcMetrics`
- `BookSearchDocument -> ArcSearchDocument`
- `BookReadState -> ArcReadState`
- `bookId -> arcId` на Prisma field level
- `Book* enum -> Arc* enum`

Что важно:

- этот пакет нельзя смешивать с unrelated cleanup;
- после него обязательно regenerate Prisma client;
- нужно проверить все `select/include/orderBy/where` в arcs-layer.

Критерий завершения:

- `prisma/schema.prisma` уже описывает `Arc` как каноничную модель;
- приложение компилируется против нового Prisma client.

### Wave 4. SQL and Storage Object Migration

Цель:

- выровнять физические SQL-объекты под новую схему.

Что делаем:

- переписываем raw SQL в:
  - [src/server/repos/arcsSearch.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/arcsSearch.ts)
- обновляем table/type/index/fk names при необходимости;
- приводим migrations и live schema к `Arc*`, если было принято решение именно физически переименовывать объекты;
- проверяем indexes на discovery/search/read-state.

Что особенно опасно:

- enum casts типа `"BookStatus"`;
- SQL joins на `"BookSearchDocument"` и `"BookMetrics"`;
- foreign keys;
- индексы на `bookId`.

Критерий завершения:

- raw SQL больше не опирается на `Book*`;
- migration state соответствует новой физической схеме.

### Wave 5. Data Verification and Rebuild

Цель:

- убедиться, что после миграции discovery и gameplay не деградировали.

Что проверяем:

- создание арки;
- чтение public arc restricted-пользователем;
- создание главы player-пользователем;
- публикация главы;
- создание поста;
- follow/unfollow;
- notifications;
- read-state;
- discovery catalog;
- search;
- continue reading;
- collaborators;
- chapter open/close.

Что, вероятно, нужно сделать:

- rebuild discovery metrics;
- rebuild search documents;
- прогнать smoke-сценарии по `arcs/[slug]` и `arcs/[slug]/[index]`.

Критерий завершения:

- данные не потеряны;
- ключевые пользовательские сценарии не сломаны;
- discovery/search/read-state дают ожидаемые результаты.

### Wave 6. Legacy Removal

Цель:

- удалить оставшийся `book` compatibility layer.

Что удаляем только в самом конце:

- `/api/books/*` alias routes;
- `book:*` realtime aliases;
- `bookId/bookSlug/bookTitle` fallback payload keys;
- `Book*` alias exports в server helpers;
- временные comments/bridges, введённые на время миграции.

Критерий завершения:

- `book` больше не является runtime boundary;
- проект полностью живёт на `arc`.

## Рекомендуемый порядок пакетов

Ниже уже практический execution order:

1. `Wave 1A`: discovery/read-state service aliases
2. `Wave 1B`: storage helper imports cleanup
3. `Wave 2A`: payload key audit
4. `Wave 2B`: remove most runtime `book*` fallback consumers
5. `Wave 3A`: draft Prisma schema patch
6. `Wave 3B`: regenerate Prisma client and compile fixups
7. `Wave 4A`: raw SQL migration
8. `Wave 5A`: rebuild data and smoke verification
9. `Wave 6A`: legacy alias removal

## Что нельзя делать в half-state

Есть несколько опасных полусостояний.

### Нельзя

- перевести Prisma field на `arcId`, но оставить старый raw SQL на `bookId`;
- переименовать enums в schema, но не обновить enum casts в SQL;
- удалить `/api/books/*`, пока есть клиенты или server actions, которые туда ходят;
- убрать `book*` payload keys раньше, чем форматтеры/клиенты/нотификаторы перестанут их читать;
- удалить alias exports до того, как все импорты переедут на `arc`.

## Рекомендуемая техника миграции

Практически правильнее всего идти так:

- один пакет = одна волна или подволна;
- после каждой волны запускать targeted lint/type checks;
- критичные переходы делать через compatibility bridges;
- удаление legacy boundary делать только после подтверждённой стабильности.

## Что можно делать уже сейчас

Без риска можно продолжать:

- Wave 1 alias-first cleanup;
- подготовку import surface к `Arc*`;
- сбор инвентаря remaining `Book*` exports/functions;
- подготовку draft Prisma patch без применения.

## Следующий конкретный шаг

После этого плана самый логичный следующий документ или пакет:

- либо `PRISMA_ARC_SCHEMA_PATCH_DRAFT`
- либо `WAVE_1_STORAGE_ALIAS_CLEANUP`

С учётом текущего состояния проекта правильнее сначала добить `WAVE_1_STORAGE_ALIAS_CLEANUP`, а в schema migration идти уже после него.
