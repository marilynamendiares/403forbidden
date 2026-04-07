# ARC Schema Target V1

Дата: `2026-03-31`

## Назначение

Этот документ фиксирует целевой data canon для перехода от `Book`-схемы к `Arc`-схеме.

Это не миграция и не SQL-патч.

Это ответ на вопрос:

`какой должна стать схема данных, если arc является каноничной сущностью продукта?`

## Ключевой принцип

На уровне продукта, UI, API и архитектуры главная сущность называется `Arc`.

Следовательно, на целевой схеме данных:

- `Book` должен стать `Arc`;
- `bookId` должен стать `arcId`;
- производные сущности и enum names тоже должны перейти в `Arc*`;
- legacy `book`-слой должен остаться только как временная совместимость на время миграции.

## Целевая главная сущность

### Было

- `model Book`

### Должно стать

- `model Arc`

### Целевые поля

Базовая структура `Arc` должна сохранить нынешнюю бизнес-суть:

- `id`
- `ownerId`
- `owner`
- `title`
- `slug`
- `publicSlug`
- `tagline`
- `summary`
- `hook`
- `introHtml`
- `coverUrl`
- `status`
- `type`
- `format`
- `joinPolicy`
- `visibility`
- `searchVisibility`
- `allowDiscovery`
- `createdAt`
- `updatedAt`

## Целевые enum names

### Было

- `BookStatus`
- `BookType`
- `BookFormat`
- `BookJoinPolicy`
- `BookVisibility`
- `BookSearchVisibility`

### Должно стать

- `ArcStatus`
- `ArcType`
- `ArcFormat`
- `ArcJoinPolicy`
- `ArcVisibility`
- `ArcSearchVisibility`

## Целевые relation fields

### Главное правило

Там, где сейчас relation field называется `bookId`, целевое имя должно быть `arcId`.

### Основные переходы

- `Chapter.bookId -> Chapter.arcId`
- `Follow.bookId -> Follow.arcId`
- `Collaborator.bookId -> Collaborator.arcId`
- `TurnQueue.bookId -> TurnQueue.arcId`
- `BookTag.bookId -> ArcTag.arcId`
- `BookFollow.bookId -> ArcFollow.arcId`
- `BookMetrics.bookId -> ArcMetrics.arcId`
- `BookSearchDocument.bookId -> ArcSearchDocument.arcId`
- `BookReadState.bookId -> ArcReadState.arcId`

## Целевые model names

### Tag binding

- `BookTag -> ArcTag`

### Follow / metrics / discovery

- `BookFollow -> ArcFollow`
- `BookMetrics -> ArcMetrics`
- `BookSearchDocument -> ArcSearchDocument`
- `BookReadState -> ArcReadState`

### Main model

- `Book -> Arc`

## Что сохраняется без переосмысления

Следующие сущности по смыслу остаются правильными и не требуют product rename:

- `Chapter`
- `ChapterPost`
- `ForumCategory`
- `ForumThread`
- `ForumPost`
- `Comment`
- `Tag`
- `Reaction`
- `Notification`
- `Collaborator`
- `TurnQueue`
- `EditAudit`
- `Wallet`
- `ShopItem`
- `InventoryItem`
- `ChapterPostLike`
- `ChapterPostReputationGrant`

Их нужно только переподключить к `Arc`, где это касается relation names.

## Целевая Arc-иерархия

В терминах схемы и продукта:

- `Arc`
  - содержит `Chapter[]`
  - содержит `Collaborator[]`
  - содержит `TurnQueue[]`
  - содержит `ArcTag[]`
  - содержит `ArcFollow[]`
  - содержит `ArcMetrics`
  - содержит `ArcSearchDocument`
  - содержит `ArcReadState[]`

Это и есть канонический data-center для совместного письма и discovery.

## О чём важно договориться до миграции

### 1. Нужен ли `ArcType`

Сейчас есть:

- `BookType = SOLO | COOP`
- `BookFormat = SOLO | DUO | GROUP`

Это выглядит частично дублирующимся.

Перед миграцией нужно решить:

- сохраняем оба поля;
- или `type` убирается как исторический слой;
- или один из них становится derived field.

Текущее предположение:

- `format` выглядит более полезным продуктово;
- `type` похож на historical technical field.

### 2. Нужен ли отдельный privacy field

Сейчас доступ частично завязан на:

- `visibility`
- `searchVisibility`
- `allowDiscovery`

По текущей truth-модели этого пока достаточно.

Значит, в `V1` можно оставить:

- `ArcVisibility`
- `ArcSearchVisibility`
- `allowDiscovery`

и не вводить новый privacy field до появления реальной продуктовой необходимости.

### 3. Нужно ли переименовывать `Follow`

В модели `Follow` сейчас смешаны разные target types:

- user
- book
- forum thread

Это значит:

- `Follow` как общая сущность может остаться `Follow`;
- но поле `bookId` внутри неё должно стать `arcId`.

Отдельный `ArcFollow` уже существует параллельно как discovery follow layer.

Поэтому до миграции нужно решить:

- оставляем ли оба слоя навсегда;
- или `Follow` для arc вообще должен быть выпилен позже;
- или `ArcFollow` станет единственным follow-хранилищем для arcs.

Текущее предположение:

- `ArcFollow` выглядит как каноничный arcs-follow слой;
- старый polymorphic `Follow.bookId` вероятно является историческим долгом.

## Предлагаемый целевой Prisma shape

Ниже не финальный код, а каноничный target shape:

```prisma
enum ArcStatus {
  ONGOING
  FINISHED
  HIATUS
  ABANDONED
}

enum ArcType {
  SOLO
  COOP
}

enum ArcFormat {
  SOLO
  DUO
  GROUP
}

enum ArcJoinPolicy {
  PRIVATE
  CURATED
  OPEN
}

enum ArcVisibility {
  STANDARD
  UNDERGROUND
}

enum ArcSearchVisibility {
  PUBLIC
  LIMITED
  HIDDEN
}

model Arc {
  id               String   @id @default(cuid())
  ownerId          String
  title            String
  slug             String
  publicSlug       String?  @unique
  tagline          String?
  summary          String?
  hook             String?
  introHtml        String?
  coverUrl         String?
  status           ArcStatus @default(ONGOING)
  type             ArcType   @default(SOLO)
  format           ArcFormat @default(SOLO)
  joinPolicy       ArcJoinPolicy @default(PRIVATE)
  visibility       ArcVisibility @default(STANDARD)
  searchVisibility ArcSearchVisibility @default(PUBLIC)
  allowDiscovery   Boolean @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  chapters         Chapter[]
  tags             ArcTag[]
  collaborators    Collaborator[]
  turns            TurnQueue[]
  follows          ArcFollow[]
  metrics          ArcMetrics?
  searchDocument   ArcSearchDocument?
  readStates       ArcReadState[]

  @@unique([ownerId, slug])
}
```

## Что НЕ входит в V1

Этот target не пытается решить:

- split `Arc` на public/private submodels;
- новую economy schema;
- pager schema;
- world/content schema;
- forum schema rewrite.

Это только canon для слоя `Book -> Arc`.

## Migration guidance

Из этого target следует, что миграция должна идти не в один шаг, а как минимум в несколько волн:

1. alias-first service layer
2. Prisma schema transition
3. generated client refresh
4. raw SQL transition
5. data validation
6. legacy cleanup

## Практический вывод

`ARC_SCHEMA_TARGET_V1` достаточно конкретен, чтобы стать основой для следующего документа:

- `BOOK_TO_ARC_DATA_MIGRATION_PLAN`

Именно этот документ уже должен будет отвечать на вопрос:

`в каком порядке и какими пакетами реально переводить schema.prisma, SQL и runtime-код?`
