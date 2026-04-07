# Legacy Alias Audit

Дата: `2026-03-31`

## Статус

Документ обновлён после фактического удаления legacy `book/books` compatibility layer из active runtime.

На текущем этапе:

- `src/app/api/books/*` удалён;
- `src/components/follow/FollowBookButton.tsx` удалён;
- `src/components/BooksLiveClient.tsx` удалён;
- `book:*` SSE aliases удалены;
- helper aliases вроде `followBook`, `getBookBySlug`, `refreshDiscoveryForBook*`, `upsertBookReadState` удалены из active `src`;
- `bookId/bookSlug/bookTitle` больше не используются в active runtime payload contracts.

## Что ещё осталось

Остаточный `book`-слой теперь почти полностью сидит в schema/storage boundary:

- [prisma/schema.prisma](/Users/inokentykonovalov/projects/personal/403forbidden/prisma/schema.prisma)
- [src/server/repos/arcsSearch.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/arcsSearch.ts)
- [src/server/arcs/discoveryFoundation.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/arcs/discoveryFoundation.ts)
- [src/server/arcs/discoveryCompat.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/arcs/discoveryCompat.ts)
- generated Prisma client under `prisma/src/generated/prisma/*`

Примеры того, что ещё может встречаться:

- raw SQL table/type names `"Book*"`
- raw SQL column names `"bookId"`
- DB enum/table maps
- исторические migration files
- historical docs in `docs/_facts/*`

## Практический вывод

Legacy alias phase по сути завершена.

Следующий слой работы уже не про compatibility aliases, а про storage/data canon:

- DB-bound cleanup;
- при необходимости physical SQL rename wave;
- дальнейшая чистка только там, где `book` всё ещё продиктован существующей схемой данных или историческими артефактами.
