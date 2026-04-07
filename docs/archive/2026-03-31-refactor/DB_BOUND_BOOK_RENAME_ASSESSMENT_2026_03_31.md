# DB-Bound Book Rename Assessment

Дата: `2026-03-31`

## Назначение

Этот документ фиксирует оставшийся слой `book/books`, который уже нельзя безопасно вычищать простым application-level rename.

Ниже перечислено то, что связано с Prisma schema, SQL, generated client, внешними и внутренними контрактами данных, а также то, что потребует осознанной миграции.

## Вывод

На текущем этапе проект уже хорошо очищен от `book/books` в product-facing naming, UI, route semantics, access logic и значительной части server/application helpers.

Оставшийся `book`-слой в основном относится к данным, а не к presentation layer.

Это означает:

- дальше нужен не обычный cleanup-пакет, а отдельный migration program;
- смешивать это с обычным рефакторингом опасно;
- сначала нужно зафиксировать целевую схему `arc`, потом отдельно выполнять Prisma/SQL migration waves.

## Что уже является DB-bound

### 1. Prisma core model

Главная сущность всё ещё называется `Book`:

- [prisma/schema.prisma](/Users/inokentykonovalov/projects/personal/403forbidden/prisma/schema.prisma)

Ключевые связанные сущности и поля:

- `model Book`
- `Chapter.bookId`
- `BookTag`
- `Follow.bookId`
- `Collaborator.bookId`
- `TurnQueue.bookId`
- `BookFollow`
- `BookMetrics`
- `BookSearchDocument`
- `BookReadState`

Это уже не cosmetic naming. Это структура БД.

### 2. Prisma enums

В схеме используются:

- `BookStatus`
- `BookType`
- `BookFormat`
- `BookJoinPolicy`
- `BookVisibility`
- `BookSearchVisibility`

Они протянуты в Prisma client, API validators и query logic.

### 3. SQL и raw queries

Есть прямые SQL-зависимости на существующие table/type names:

- [src/server/repos/arcsSearch.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/arcsSearch.ts)

Там используются:

- `"Book"`
- `"BookTag"`
- `"BookSearchDocument"`
- `"BookMetrics"`
- `"BookStatus"`
- `"BookFormat"`
- `"BookVisibility"`
- `"BookSearchVisibility"`
- `bookId`

Это значит, что rename схемы автоматически заденет raw SQL.

### 4. Discovery/read-state storage layer

В discovery foundation и pipeline всё ещё канонически живут book-based storage names:

- [src/server/arcs/discoveryFoundation.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/arcs/discoveryFoundation.ts)
- [src/server/arcs/discoveryPipeline.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/arcs/discoveryPipeline.ts)
- [src/server/arcs/readState.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/arcs/readState.ts)

Примеры:

- `ensureBookFoundation`
- `rebuildBookMetrics`
- `rebuildBookSearchDocument`
- `rebuildBookDiscoveryFoundation`
- `refreshDiscoveryForBook`
- `refreshDiscoveryMetricsForBook`
- `refreshDiscoverySearchForBook`
- `refreshDiscoveryContentForBook`
- `upsertBookReadState`
- таблицы `BookMetrics`, `BookSearchDocument`, `BookReadState`

### 5. Generated Prisma client

Сгенерированные артефакты уже содержат нынешнюю схему:

- [prisma/src/generated/prisma/schema.prisma](/Users/inokentykonovalov/projects/personal/403forbidden/prisma/src/generated/prisma/schema.prisma)
- [prisma/src/generated/prisma/index.d.ts](/Users/inokentykonovalov/projects/personal/403forbidden/prisma/src/generated/prisma/index.d.ts)
- [prisma/src/generated/prisma/index.js](/Users/inokentykonovalov/projects/personal/403forbidden/prisma/src/generated/prisma/index.js)

Любой schema rename потребует regenerate и может затронуть очень большой surface area.

### 6. Existing migrations

У проекта уже есть миграции с book-based table/type names:

- [prisma/migrations/20251030100022_add_book_follow/migration.sql](/Users/inokentykonovalov/projects/personal/403forbidden/prisma/migrations/20251030100022_add_book_follow/migration.sql)
- [prisma/migrations/20260319120000_arcs_discovery_foundation/migration.sql](/Users/inokentykonovalov/projects/personal/403forbidden/prisma/migrations/20260319120000_arcs_discovery_foundation/migration.sql)
- [prisma/migrations/20260311172826_add_book_intro_html/migration.sql](/Users/inokentykonovalov/projects/personal/403forbidden/prisma/migrations/20260311172826_add_book_intro_html/migration.sql)

Это важно, потому что rename здесь уже значит:

- rename tables
- rename indexes
- rename foreign keys
- rename enum types
- возможно data copy / compatibility SQL

## Что ещё осталось, но уже на границе

Это ещё не обязательно schema migration, но уже тесно завязано на data model:

### Storage/service names

- [src/server/services/books.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/services/books.ts)
- [src/server/arcs/discoveryPipeline.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/arcs/discoveryPipeline.ts)
- [src/server/arcs/discoveryFoundation.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/arcs/discoveryFoundation.ts)
- [src/server/arcs/readState.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/arcs/readState.ts)

Там можно переименовывать exports через alias-слой, но нельзя бездумно ломать совместимость, потому что внутри всё всё равно опирается на `Book*` storage.

### API compatibility fields

Даже после cleanup ещё есть compatibility payloads:

- `bookId`
- `bookSlug`
- `bookTitle`

Они всё ещё живут как fallback/legacy keys в:

- notifications
- chapter publish/new-post payloads
- read-state compatibility handler

Эти поля уже можно постепенно сжимать, но только после аудита всех потребителей.

## Что пока можно НЕ трогать

Следующие вещи можно сознательно оставить до полноценной data migration:

- `model Book`
- все `bookId` relation fields в Prisma
- `Book*` enums
- `BookMetrics`, `BookSearchDocument`, `BookReadState`, `BookFollow`
- raw SQL в search/discovery
- generated prisma client
- historical migrations

Это не “грязь”, а текущая data backbone.

## Риски полного rename сейчас

Если прямо сейчас грубо переименовать `Book -> Arc` в схеме, можно сломать:

- Prisma client generation
- SQL в search/discovery
- foreign keys и relation names
- indexes и constraints
- existing production/local data
- route handlers и services, которые сейчас всё ещё читают `bookId`
- notifications/read-state/follow/discovery pipeline

Именно поэтому текущий safe/medium cleanup делался отдельно.

## Рекомендуемая программа миграции

### Wave 1. Alias-first service layer

Цель:

- довести exports до `arc`-канона без изменения БД;
- оставить `book` только как внутреннюю storage-терминологию.

Кандидаты:

- `refreshDiscoveryForBook -> refreshDiscoveryForArc`
- `refreshDiscoveryMetricsForBook -> refreshDiscoveryMetricsForArc`
- `refreshDiscoverySearchForBook -> refreshDiscoverySearchForArc`
- `refreshDiscoveryContentForBook -> refreshDiscoveryContentForArc`
- `upsertBookReadState -> upsertArcReadState` уже частично сделан

### Wave 2. Schema design proposal

Сначала нужно решить, каким будет целевой data canon:

- `model Arc` вместо `model Book`
- `arcId` вместо `bookId`
- `ArcStatus`, `ArcFormat`, `ArcJoinPolicy`, `ArcVisibility`, `ArcSearchVisibility`
- `ArcFollow`, `ArcMetrics`, `ArcSearchDocument`, `ArcReadState`

Без этого делать SQL migration нельзя.

### Wave 3. Prisma schema migration

Пакет должен включать:

- rename моделей или введение `@@map`/`@map`
- rename полей и relations
- update application imports/types
- regenerate prisma client

Это уже большой отдельный пакет.

### Wave 4. SQL/raw query migration

Нужно отдельно переписать:

- raw SQL в search/discovery
- enum casts
- table names
- index names
- fk names

### Wave 5. Legacy cleanup

Только после успешной migration wave можно удалять:

- compatibility `bookId/bookSlug/bookTitle` payload keys
- legacy `/api/books/*`
- `book:*` SSE aliases
- `book` aliases в helper exports

## Практический вывод

Сейчас проект в хорошем состоянии для продолжения обычного рефакторинга.

Но полное искоренение `book/books` дальше уже упирается не в naming cleanup, а в controlled data migration.

Следующий разумный шаг:

1. сделать `ARC_SCHEMA_TARGET_V1` документ;
2. на его основе собрать `Book->Arc Data Migration Plan`;
3. только потом трогать Prisma schema и SQL.
