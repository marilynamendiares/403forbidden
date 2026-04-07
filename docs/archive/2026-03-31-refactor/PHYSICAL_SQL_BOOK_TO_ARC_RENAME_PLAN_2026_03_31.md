# Physical SQL Book To Arc Rename Plan

Дата: `2026-03-31`

## Назначение

К этому моменту active runtime уже переведён на `arc`.

Оставшийся `book`-слой живёт в physical SQL names:

- таблицы `Book`, `BookTag`, `BookFollow`, `BookMetrics`, `BookSearchDocument`, `BookReadState`
- enum types `BookStatus`, `BookType`, `BookFormat`, `BookJoinPolicy`, `BookVisibility`, `BookSearchVisibility`
- колонки `bookId`
- индексы и foreign key constraints с `Book*` / `bookId`
- raw SQL в [src/server/repos/arcsSearch.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/arcsSearch.ts)
- detection logic в [src/server/arcs/discoveryCompat.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/arcs/discoveryCompat.ts)

Этот документ описывает уже не runtime cleanup, а именно physical DB rename wave.

## Preconditions

Перед physical rename должно быть true:

- active app runtime больше не зависит от `/api/books/*`
- active runtime не эмитит и не слушает `book:*`
- active payload contracts не используют `bookId/bookSlug/bookTitle`
- Prisma schema уже работает через `Arc*` model/enum names с `@@map/@map`
- `pnpm exec tsc --noEmit --pretty false` проходит

## Scope

### Rename targets

1. SQL tables:
- `"Book"` -> `"Arc"`
- `"BookTag"` -> `"ArcTag"`
- `"BookFollow"` -> `"ArcFollow"`
- `"BookMetrics"` -> `"ArcMetrics"`
- `"BookSearchDocument"` -> `"ArcSearchDocument"`
- `"BookReadState"` -> `"ArcReadState"`

2. SQL enum types:
- `"BookStatus"` -> `"ArcStatus"`
- `"BookType"` -> `"ArcType"`
- `"BookFormat"` -> `"ArcFormat"`
- `"BookJoinPolicy"` -> `"ArcJoinPolicy"`
- `"BookVisibility"` -> `"ArcVisibility"`
- `"BookSearchVisibility"` -> `"ArcSearchVisibility"`

3. SQL columns:
- every `"bookId"` -> `"arcId"` where relation is actually about arcs

4. Constraints and indexes:
- PK names
- FK names
- unique indexes
- named secondary indexes

## Execution Waves

### Wave 1. Raw SQL inventory freeze

Перед реальной миграцией:

- зафиксировать все raw SQL references;
- зафиксировать все index/constraint names;
- зафиксировать все `@@map/@map`, которые станут больше не нужны после physical rename.

Критические файлы:

- [src/server/repos/arcsSearch.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/arcsSearch.ts)
- [src/server/arcs/discoveryCompat.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/arcs/discoveryCompat.ts)
- [prisma/schema.prisma](/Users/inokentykonovalov/projects/personal/403forbidden/prisma/schema.prisma)

### Wave 2. Physical SQL rename migration

Один migration package должен:

- `ALTER TABLE ... RENAME TO ...`
- `ALTER TYPE ... RENAME TO ...`
- `ALTER TABLE ... RENAME COLUMN "bookId" TO "arcId"`
- переименовать indexes / constraints там, где имя важно для сопровождения

Важно:

- делать это одной согласованной миграцией;
- не смешивать с feature work;
- не менять runtime code в этом же пакете больше необходимого.

### Wave 3. Prisma map cleanup

После physical SQL rename:

- убрать `@@map("Book*")` и `@map("bookId")` там, где они больше не нужны;
- regenerate Prisma client;
- починить compile surface, если что-то всплывёт.

### Wave 4. Raw SQL patch

После реального rename нужно обновить:

- table names в [src/server/repos/arcsSearch.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/arcsSearch.ts)
- enum casts в [src/server/repos/arcsSearch.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/arcsSearch.ts)
- schema-missing detection в [src/server/arcs/discoveryCompat.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/arcs/discoveryCompat.ts)

### Wave 5. Historical cleanup

После стабильной работы:

- обновить docs, где `book` ещё описывается как active compatibility layer;
- historical migration files не переписывать, но зафиксировать, что они до-rename.

## Verification

После physical rename обязательно:

1. `pnpm prisma generate`
2. `pnpm exec tsc --noEmit --pretty false`
3. targeted `eslint`
4. smoke-check:
- `/arcs`
- `/arcs/[slug]`
- `/arcs/[slug]/[index]`
- create arc
- create chapter
- publish chapter
- create post
- follow arc
- discovery search
- read-state

## Risks

Главные риски:

- raw SQL casts на старые enum names;
- joins на старые table names;
- сломанные composite keys после rename `bookId -> arcId`;
- неучтённые index/constraint names;
- stale generated artifacts или stale `.next` types.

## Practical Conclusion

Runtime cleanup phase можно считать почти завершённой.

Следующий тяжёлый шаг уже не naming cleanup, а controlled DB migration.
