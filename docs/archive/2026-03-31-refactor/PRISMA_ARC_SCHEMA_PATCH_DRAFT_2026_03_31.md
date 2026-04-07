# Prisma Arc Schema Patch Draft

Дата: `2026-03-31`

## Назначение

Этот документ описывает draft-патч для будущего перехода `prisma/schema.prisma` с `Book`-канона на `Arc`-канон.

Этот документ начался как pre-apply draft, но часть `Stage C` уже применена.

Это рабочий черновик того, какие блоки схемы и в каком порядке нужно менять.

## Уже применено

На `2026-03-31` уже реально выполнено:

- Prisma enums renamed to `Arc*`
- старые DB enum names сохранены через `@@map(...)`
- Prisma client regenerated
- active runtime imports для enum-типов переведены на `Arc*`

То есть `Stage C` частично закрыт на Prisma API level без physical DB rename.

## Главная идея

Самый безопасный путь выглядит так:

1. сначала перевести Prisma API surface на `Arc`;
2. по возможности использовать `@@map` и `@map`, чтобы физическая БД могла временно остаться на старых SQL names;
3. только потом, отдельной волной, решать physical SQL rename.

То есть draft-патч должен быть Prisma-first, а не SQL-first.

## Предлагаемая стратегия

### Stage A. Rename Prisma models, preserve SQL names

Пример подхода:

```prisma
model Arc {
  @@map("Book")
}
```

То же для связных сущностей:

```prisma
model ArcTag {
  @@map("BookTag")
}

model ArcFollow {
  @@map("BookFollow")
}

model ArcMetrics {
  @@map("BookMetrics")
}

model ArcSearchDocument {
  @@map("BookSearchDocument")
}

model ArcReadState {
  @@map("BookReadState")
}
```

Это позволит:

- перевести Prisma client surface на `Arc`;
- не ломать SQL tables немедленно;
- не требовать instant physical DB rename.

### Stage B. Rename fields with `@map`

Принцип:

- Prisma field becomes `arcId`
- underlying SQL column may remain `"bookId"` temporarily

Пример:

```prisma
model Chapter {
  arcId String @map("bookId")
  arc   Arc    @relation(fields: [arcId], references: [id])
}
```

Аналогично:

- `Follow.arcId @map("bookId")`
- `Collaborator.arcId @map("bookId")`
- `TurnQueue.arcId @map("bookId")`
- `ArcTag.arcId @map("bookId")`
- `ArcFollow.arcId @map("bookId")`
- `ArcMetrics.arcId @map("bookId")`
- `ArcSearchDocument.arcId @map("bookId")`
- `ArcReadState.arcId @map("bookId")`

### Stage C. Rename enums at Prisma layer

Предпочтительно:

- `ArcStatus`
- `ArcType`
- `ArcFormat`
- `ArcJoinPolicy`
- `ArcVisibility`
- `ArcSearchVisibility`

Но это самый рискованный участок, потому что raw SQL сейчас кастит `"BookStatus"` и другие типы.

Поэтому возможны два пути:

#### Вариант 1

Сразу переименовать enum names в Prisma и затем быстро переписать SQL.

Плюс:

- чище целевой canon

Минус:

- выше шанс half-state errors

#### Вариант 2

Оставить enum db names временно через mapping/совместимость, а physical rename перенести на SQL wave.

Плюс:

- безопаснее

Минус:

- дольше живёт смешанный слой

Текущее состояние:

- `Variant 2` уже применён для enum-слоя

## Блоки схемы, которые нужно переписать

### 1. Enums

Текущие блоки:

- `enum BookStatus`
- `enum BookType`
- `enum BookFormat`
- `enum BookJoinPolicy`
- `enum BookVisibility`
- `enum BookSearchVisibility`

Целевые блоки:

- `enum ArcStatus`
- `enum ArcType`
- `enum ArcFormat`
- `enum ArcJoinPolicy`
- `enum ArcVisibility`
- `enum ArcSearchVisibility`

### 2. User relations

В `User` сейчас:

- `books Book[]`
- `BookFollow BookFollow[]`
- `bookReadStates BookReadState[]`

Целевой вид:

- `arcs Arc[]`
- `arcFollows ArcFollow[]`
- `arcReadStates ArcReadState[]`

### 3. Main model

Текущий блок:

- `model Book`

Целевой блок:

- `model Arc`
- `@@map("Book")`

### 4. Chapter relation

Текущий вид:

- `bookId`
- `book Book`
- `@@unique([bookId, index])`
- `@@index([bookId, isDraft, publishedAt(sort: Desc)])`

Целевой вид:

- `arcId String @map("bookId")`
- `arc Arc`
- `@@unique([arcId, index])`
- `@@index([arcId, isDraft, publishedAt(sort: Desc)])`

### 5. Join tables / support models

Нужно переписать:

- `BookTag -> ArcTag`
- `BookFollow -> ArcFollow`
- `BookMetrics -> ArcMetrics`
- `BookSearchDocument -> ArcSearchDocument`
- `BookReadState -> ArcReadState`

### 6. Cross-model references

Нужно переписать:

- `Follow.bookId -> Follow.arcId`
- `Collaborator.bookId -> Collaborator.arcId`
- `TurnQueue.bookId -> TurnQueue.arcId`

## Самые рискованные места

### 1. Relation names in Prisma client

После rename изменятся:

- `.book`
- `.books`
- `.BookFollow`
- `.bookReadStates`

Это автоматически заденет TypeScript surface.

### 2. `arcBookCardSelect`

- [src/server/arcs/arcSelects.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/arcs/arcSelects.ts)

Сейчас там:

- `Prisma.BookSelect`
- `Prisma.BookGetPayload`

После schema patch это станет:

- `Prisma.ArcSelect`
- `Prisma.ArcGetPayload`

### 3. Catalog/search API validators

- [src/app/api/arcs/catalog/route.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/api/arcs/catalog/route.ts)
- [src/app/api/arcs/search/route.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/api/arcs/search/route.ts)

Сейчас они завязаны на:

- `BookStatus`
- `BookFormat`
- `BookVisibility`

### 4. Raw SQL

- [src/server/repos/arcsSearch.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/arcsSearch.ts)

Этот файл нельзя оставлять как есть после полного schema rename.

## Рекомендуемый applied order

### Patch 1

Rename Prisma models and fields with `@@map/@map`, but do not touch raw SQL yet.

Цель:

- сгенерировать новый Prisma client
- увидеть compile surface

### Patch 2

Fix TypeScript compile errors in:

- `arcSelects`
- `arcsCatalog`
- `arcsDiscovery`
- `arcsSearch`
- API routes
- chapter/services/repos

### Patch 3

Update raw SQL and enum casts.

### Patch 4

Run data validation and compatibility cleanup.

## Что не стоит делать в первом applied Prisma patch

Не стоит в том же пакете:

- физически переименовывать SQL tables;
- удалять `/api/books/*`;
- удалять `book:*` SSE aliases;
- удалять payload fallback keys;
- чистить все comments/docs.

Первый Prisma patch должен решать только schema/client surface.

## Практический вывод

`PRISMA_ARC_SCHEMA_PATCH_DRAFT` готовит нас к реальному следующему этапу:

- либо собрать ещё более конкретный `APPLIED_SCHEMA_PATCH_CHECKLIST`
- либо уже начать первый фактический schema patch пакет

С учётом текущего состояния проекта я бы следующим шагом делал именно checklist и затем реальный Prisma patch в отдельной фазе.
