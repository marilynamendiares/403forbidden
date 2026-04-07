# ARCS Discovery Phase 0

Техническая карта подготовки нового `/arcs` как discovery-страницы с поиском, каталогом, трендами, живостью и персонализацией.

Статус: draft / working plan

## 1. Цель

Превратить текущую страницу `/arcs` из простого списка книг в полноценный discovery-layer для арок:

- главный поисковик по названиям, участникам, тегам и фрагментам постов;
- редакционные секции `Top / Trending`, `New / Just Started`, `Recently Updated`;
- основной каталог `Explore / All Arcs` с фильтрами;
- персонализированный блок `Continue Reading`;
- отдельный слой для `Underground / Hidden`.

Ключевая задача Phase 0: не реализовать UI, а зафиксировать каноничную архитектуру, чтобы последующая реализация не расползлась по случайным полям, ad-hoc API и тяжёлым запросам.

## 2. Текущее состояние проекта

Ниже только то, что уже реально существует в коде и БД.

### 2.1. Что уже есть

- `Book` уже хранит базовые поля арки: `title`, `slug`, `tagline`, `introHtml`, `status`, `type`, `coverUrl`.
- `Chapter` уже имеет `status`, `completedAt`, `lastPostAt`, `contentHtml`.
- Внутри главы уже существует append-only поток постов `ChapterPost`.
- На постах уже есть лайки и reputation.
- Есть подписка на книги `BookFollow`.
- Есть роли и коллаборация через `Collaborator`.
- При создании поста обновляется `chapter.lastPostAt`, что уже подходит для секций живости.

Основные точки:

- [prisma/schema.prisma](/Users/inokentykonovalov/projects/personal/403forbidden/prisma/schema.prisma): `Book`, `Chapter`, `ChapterPost`, `BookFollow`, `ChapterPostLike`, `ChapterPostReputationGrant`
- [src/server/services/books.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/services/books.ts)
- [src/server/services/chapters.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/services/chapters.ts)
- [src/server/repos/chapters.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/chapters.ts)

### 2.2. Что уже работает, но недостаточно для discovery

- `/api/books` сейчас отдаёт слишком бедный список для нового `/arcs`: только `slug`, `title`, `createdAt`, `status`.
- Теги присутствуют в схеме как `BookTag`, но пользовательского потока работы с тегами пока нет.
- `Book.type` пока содержит только `SOLO | COOP`, этого недостаточно для `solo / duo / group / joinable`.
- Нет поискового индекса и нет поиска по постам.
- Нет reading history / continue reading.
- Нет view tracking, значит метрика просмотров пока отсутствует.
- Нет денормализованного слоя статистики для быстрых секций каталога.

## 3. Продуктовые секции и системные последствия

### 3.1. Главный поиск

Требования:

- поиск по title;
- fuzzy search;
- поиск по участникам;
- поиск по тегам;
- поиск по фрагментам постов.

Последствия:

- нужен отдельный поисковый индекс;
- нужно хранить нормализованный plain-text по постам, а не пытаться искать по HTML;
- нужен единый поисковый endpoint, а не фильтрация массива на клиенте.

### 3.2. Top / Trending

Требования:

- горячие арки с ростом активности;
- учёт лайков, новых постов, фоллов, позже просмотров;
- карточки с участниками, hook, статусом и `heat score`.

Последствия:

- нужен слой агрегированных метрик;
- `heat score` должен считаться сервером, а не на клиенте;
- `heat score` должен быть derived-значением и не использоваться как единственная truth-модель активности.

### 3.3. New / Just Started

Требования:

- новые арки с `0–3` постами;
- не путать новую арку и старую заброшенную арку с малым количеством постов.

Последствия:

- нужен `postsTotal`;
- нужен `startedAt`, обычно равный `book.createdAt`, но лучше опираться на первые опубликованные главы/посты.

### 3.4. Recently Updated

Требования:

- арки, где недавно появлялись новые посты или главы.

Последствия:

- нужен надёжный `lastActivityAt`;
- значение не должно вычисляться тяжёлым join’ом на каждый запрос.

### 3.5. Explore / All Arcs

Требования:

- фильтры по статусу, формату, активности;
- поддержка будущих фильтров без переписывания API;
- пагинация.

Последствия:

- нужен отдельный `catalog` endpoint;
- фильтры должны опираться на каноничные перечисления, а не свободный текст.

### 3.6. Continue Reading

Требования:

- арки, которые пользователь читает;
- арки, в которых пользователь участвует;
- арки, где можно вернуться в нужную главу/пост.

Последствия:

- нужен read-state;
- нужен персонализированный discovery endpoint;
- нельзя реализовать качественно без хранения `lastVisitedAt` и точки продолжения.

### 3.7. Underground / Hidden

Требования:

- отдельный слой арок с иным характером, песочницей, экспериментальным статусом.

Последствия:

- нужен явный флаг в модели данных;
- нужно заранее решить, hidden означает редакционную категоризацию, приватность или оба режима.

## 4. Главные архитектурные проблемы, которые нужно закрыть до реализации

### 4.1. Неоднозначная идентичность книги по `slug`

Сейчас `Book` уникален по `ownerId + slug`, а не по одному `slug`.

Это конфликтует с discovery-паттерном, потому что:

- список, поиск и карточки должны ссылаться на арку однозначно;
- сервисы часто используют `findFirst({ slug })`;
- при совпадении slug у разных владельцев discovery и follow начнут давать случайные результаты.

Решение Phase 1:

- ввести глобально уникальный публичный идентификатор арки;
- рекомендованный вариант: новый `publicSlug` или `bookKey`, уникальный для всего проекта;
- старый `slug` можно оставить как локальный/owner-scoped для совместимости, но публичные роуты discovery должны опираться на глобальную уникальность.

### 4.2. Слишком бедная классификация арок

Сейчас:

- `BookStatus`: `ONGOING | FINISHED | HIATUS`
- `BookType`: `SOLO | COOP`

Для будущего `/arcs` этого мало.

Нужно разделить:

- статус жизненного цикла;
- формат состава;
- политику доступа / joinability;
- редакционную видимость / underground.

### 4.3. Отсутствие агрегированного discovery-слоя

Если строить новые секции через прямые `findMany + groupBy` на живых таблицах постов и лайков на каждый page load, то:

- страница станет тяжёлой;
- рост данных быстро ухудшит TTFB;
- каждая новая секция начнёт дублировать разную бизнес-логику.

Нужен единый слой статистики.

### 4.4. Отсутствие search index

Поиск по title и tag ещё можно временно сделать простыми запросами, но:

- fuzzy search;
- поиск по участникам;
- поиск по фрагментам постов;

без индекса будут либо неточными, либо дорогими.

## 5. Каноничная целевая модель данных

Ниже целевая модель без привязки к точным migration names.

### 5.1. Расширение `Book`

Новые или пересматриваемые поля:

- `publicSlug String? @unique`
- `status BookLifecycleStatus`
- `format BookFormat`
- `joinPolicy BookJoinPolicy`
- `visibility BookVisibility`
- `searchVisibility BookSearchVisibility`
- `summary String?`
- `hook String?`
- `allowDiscovery Boolean @default(true)`

Замечания:

- `summary` и `hook` лучше разделить: `hook` для карточек и поиска, `summary` для более полного описания;
- `visibility` и `searchVisibility` не одно и то же: можно быть читаемой аркой, но не индексироваться глобально.

### 5.2. Новые enum’ы

Рекомендуемые enum’ы:

- `BookLifecycleStatus = ONGOING | FINISHED | HIATUS | ABANDONED`
- `BookFormat = SOLO | DUO | GROUP`
- `BookJoinPolicy = PRIVATE | CURATED | OPEN`
- `BookVisibility = STANDARD | UNDERGROUND`
- `BookSearchVisibility = PUBLIC | LIMITED | HIDDEN`

Примечание:

- `UNDERGROUND` это не ACL и не privacy. Это редакционно-продуктовый слой.
- `HIDDEN` в `BookSearchVisibility` означает отсутствие в глобальном каталоге и поиске.

### 5.3. Теги

Текущую модель `Tag` / `BookTag` можно сохранить, но её нужно довести до рабочего состояния:

- сидинг базовых discovery-тегов;
- отдельные категории тегов при необходимости;
- управляемый список тегов в редакторе книги;
- возможность фильтровать как по системным тегам, так и по mood/theme тегам.

Для Phase 1 можно оставить плоские теги.

### 5.4. `BookMetrics`

Новая таблица для дешёвых discovery-запросов.

Предлагаемая структура:

- `bookId`
- `participantsCount`
- `chaptersCount`
- `postsTotal`
- `posts7d`
- `posts30d`
- `likes7d`
- `likes30d`
- `rep7d`
- `rep30d`
- `followersCount`
- `views7d` опционально
- `views30d` опционально
- `lastChapterPublishedAt`
- `lastPostAt`
- `lastActivityAt`
- `heatScore`
- `updatedAt`

Назначение:

- `Top / Trending`
- `Recently Updated`
- activity filters `dead / warm / hot`
- часть ranking для поиска

### 5.5. `BookSearchDocument`

Новая таблица или materialized representation.

Минимальные поля:

- `bookId`
- `titleText`
- `taglineText`
- `hookText`
- `participantsText`
- `tagsText`
- `chapterTitlesText`
- `postFragmentsText`
- `combinedText`
- `updatedAt`

Оптимизация:

- в Postgres можно хранить `tsvector` отдельно;
- fuzzy часть лучше подкрепить `pg_trgm` по `title`, `participantsText`, `tagsText`.

### 5.6. `BookReadState`

Новая таблица персонализации.

Минимальные поля:

- `userId`
- `bookId`
- `lastVisitedAt`
- `lastChapterId`
- `lastPostId`
- `lastReadPostCreatedAt`
- `isParticipantSnapshot` не нужен, если можно вычислять через relations

Назначение:

- `Continue Reading`
- персональный ranking
- later: resume to exact spot

### 5.7. `BookViewEvent` или `BookViewCounter`

Для первого релиза не блокер.

Рекомендуемая стратегия:

- сначала не вводить views в ranking;
- позже добавить lightweight view events или daily aggregated counters;
- не хранить сырые pageviews без антиспама и дедупликации.

## 6. Каноничные derived-понятия

### 6.1. Activity bucket

Не хранить как строку в `Book`.

Считать из `BookMetrics`:

- `dead`: нет активности за последние 30 дней;
- `warm`: есть активность, но `heatScore` ниже порога;
- `hot`: высокая недавняя активность.

Пороговые значения должны жить в одном месте, а не быть зашиты в UI.

### 6.2. Heat score

Heat score должен быть понятным, дешёвым и предсказуемым.

Базовая формула Phase 1:

- `posts7d * 5`
- `likes7d * 3`
- `rep7d * 4`
- `followersCount * 1`
- бонус за свежесть `lastActivityAt`

Важно:

- score не должен напрямую храниться пользователем или редактироваться вручную;
- score должен пересчитываться централизованно;
- UI должен показывать округлённое значение или badge, а не обещать математическую точность.

### 6.3. Participants

Для discovery участниками арки считаются:

- владелец книги;
- коллабораторы;
- авторы опубликованных глав;
- авторы `ChapterPost`.

Нужен единый helper/aggregator, чтобы во всех секциях участники считались одинаково.

## 7. Поиск: каноничный подход

### 7.1. Почему не клиентский поиск

Нельзя:

- тянуть все арки на клиент и фильтровать их в JS;
- искать по HTML постов;
- строить fuzzy matching вручную в рантайме страницы.

Причины:

- дорого;
- неточность;
- невозможность масштабирования;
- плохая SSR-производительность.

### 7.2. Рекомендуемый backend

Phase 1:

- Postgres Full Text Search;
- `pg_trgm` для fuzzy;
- отдельный `BookSearchDocument`.

Формат запроса:

- search string;
- filters;
- sort mode;
- pagination.

### 7.3. Search ranking

Результат должен ранжироваться не только по textual match, но и по discovery quality:

- exact/prefix match в title выше;
- затем match по participants;
- затем tags;
- затем fragments;
- потом сверху накладывается `heatScore` и `lastActivityAt`.

### 7.4. Search endpoint

Предлагаемый route:

- `GET /api/arcs/search?q=&status=&format=&activity=&tag=&cursor=`

Ответ:

- список карточек;
- мета с total/next cursor;
- возможно `suggestedChips`.

## 8. Discovery API: предлагаемая схема

### 8.1. `GET /api/arcs/discovery`

Назначение:

- отдать все секции домашней discovery-страницы `/arcs`.

Секции:

- `heroFilters`
- `topTrending`
- `newJustStarted`
- `recentlyUpdated`
- `continueReading`
- `underground`

Важно:

- секции должны быть независимыми по данным;
- отсутствие персонализации не должно ломать всю страницу;
- персональная секция должна просто возвращать пустой массив для гостя.

### 8.2. `GET /api/arcs/catalog`

Назначение:

- `Explore / All Arcs` с фильтрами и пагинацией.

Параметры:

- `status`
- `format`
- `activity`
- `visibility`
- `tag`
- `sort`
- `cursor`
- `limit`

### 8.3. `GET /api/arcs/search`

Назначение:

- быстрый поисковый endpoint, который можно дёргать debounce’ом из главного input.

### 8.4. `POST /api/arcs/read-state`

Назначение:

- сохранять прогресс чтения.

Вызов:

- при открытии главы;
- при достижении поста;
- возможно debounce/throttle.

## 9. Каноничная серверная структура

Чтобы не расползалась логика, новый функционал должен идти по текущей архитектуре проекта:

- `src/server/repos/arcs/` или `src/server/repos/discovery/` для DB logic;
- `src/server/services/arcs/` для orchestration;
- `src/server/contracts.ts` или отдельный `src/server/contracts/arcs.ts` для DTO;
- `src/server/fragments.ts` для публичных select fragments;
- `src/app/api/arcs/*` только как thin routes;
- `src/app/(shell)/(protected)/arcs/page.tsx` как композиция секций, а не как место бизнес-логики.

Нельзя:

- писать тяжёлую Prisma-логику прямо в page component;
- дублировать расчёт ranking в нескольких API;
- смешивать поисковую и карточечную DTO.

## 10. Карточка арки: единый контракт

Нужен единый DTO для всех discovery-блоков.

Предлагаемый `ArcCardDTO`:

- `id`
- `publicSlug`
- `title`
- `hook`
- `tagline`
- `status`
- `format`
- `joinPolicy`
- `visibility`
- `activityBucket`
- `heatScore`
- `followersCount`
- `participants`
- `tags`
- `lastActivityAt`
- `lastChapterIndex`
- `lastPostPreview`
- `continueUrl` опционально
- `isFollowing` опционально
- `isParticipant` опционально

Преимущество:

- один и тот же контракт работает для `search`, `catalog`, `top`, `recent`, `continue`.

## 11. UI-композиция страницы `/arcs`

### 11.1. Верх страницы

- hero title;
- главный поиск;
- быстрые chips;
- подсказка / active filters state.

### 11.2. Ниже

Порядок секций:

1. `Top / Trending`
2. `New / Just Started`
3. `Recently Updated`
4. `Continue Reading` для залогиненного пользователя
5. `Underground / Hidden`
6. `Explore / All Arcs`

### 11.3. Правила деградации

- если секция пуста, она либо скрывается, либо показывает точный empty state;
- `Continue Reading` не рендерится для гостя;
- `Underground` может быть скрыт, если нет размеченных арок.

## 12. Порядок внедрения по фазам

Ниже порядок, в котором стоит реализовывать функционал.

### Phase 1. Data foundation

Цель:

- исправить идентичность книг;
- расширить метаданные;
- заложить metrics/search/read-state таблицы.

Шаги:

1. Ввести глобально уникальный публичный идентификатор книги.
2. Расширить enum’ы и поля `Book`.
3. Добавить `BookMetrics`.
4. Добавить `BookSearchDocument`.
5. Добавить `BookReadState`.
6. Написать backfill script для существующих арок.

### Phase 2. Metrics pipeline

Цель:

- научить систему быстро и стабильно считать discovery-секции.

Шаги:

1. Создать централизованный metrics recalculation service.
2. Обновлять metrics на:
   - create/update book;
   - create/publish chapter;
   - create/delete/edit post;
   - like/unlike post;
   - follow/unfollow book.
3. Подготовить activity bucket и heat score helpers.

### Phase 3. Catalog and search backend

Цель:

- получить стабильные API для `/arcs`.

Шаги:

1. `GET /api/arcs/catalog`
2. `GET /api/arcs/search`
3. `GET /api/arcs/discovery`
4. DTO и contracts
5. пагинация и фильтры

### Phase 4. Discovery UI

Цель:

- собрать новую страницу `/arcs` на реальных endpoints.

Шаги:

1. hero search block;
2. chips;
3. `Top / Trending`;
4. `New / Just Started`;
5. `Recently Updated`;
6. `Explore / All Arcs`;
7. `Underground / Hidden`.

### Phase 5. Personalization

Цель:

- добавить `Continue Reading`.

Шаги:

1. write-through read-state;
2. personalised query;
3. continue cards with resume links.

### Phase 6. Views and advanced ranking

Цель:

- улучшить ranking после запуска базовой версии.

Шаги:

1. добавить views;
2. обогатить ranking;
3. при необходимости добавить materialized views или background compaction.

## 13. Конкретные изменения по файлам и зонам проекта

### 13.1. Prisma

Потребуются изменения:

- [prisma/schema.prisma](/Users/inokentykonovalov/projects/personal/403forbidden/prisma/schema.prisma)
- новые migration files
- backfill scripts в `scripts/`

### 13.2. Server

Потребуются новые модули:

- `src/server/repos/arcs/*`
- `src/server/services/arcs/*`
- `src/server/search/*` или `src/server/discovery/*`
- `src/server/contracts/arcs.ts` или расширение текущих contracts

### 13.3. API

Потребуются новые routes:

- `src/app/api/arcs/discovery/route.ts`
- `src/app/api/arcs/catalog/route.ts`
- `src/app/api/arcs/search/route.ts`
- `src/app/api/arcs/read-state/route.ts`

### 13.4. UI

Потребуются новые компоненты:

- `ArcsSearchHero`
- `ArcsFilterChips`
- `ArcCard`
- `ArcCardStack`
- `ArcsTrendingSection`
- `ArcsRecentSection`
- `ArcsNewSection`
- `ArcsContinueSection`
- `ArcsUndergroundSection`
- `ArcsCatalogSection`

## 14. Обязательные инварианты

### 14.1. Идентичность

- discovery и поиск должны ссылаться только на глобально уникальный публичный ключ книги;
- нельзя строить новый discovery на `findFirst({ slug })`.

### 14.2. Производительность

- discovery page не должна выполнять тяжёлые N+1 запросы;
- секции должны опираться на денормализованные метрики;
- поиск должен идти в индекс, а не в полный скан таблиц.

### 14.3. Контракты

- карточка арки должна иметь единый DTO;
- API секций не должны возвращать несовместимые формы одной и той же сущности.

### 14.4. Персонализация

- отсутствие логина не должно ломать страницу;
- персональный блок должен деградировать в пустое состояние.

### 14.5. Безопасность

- hidden/unlisted арки не должны утекать через поиск;
- underground это не синоним приватности;
- search documents должны учитывать правила индексируемости.

## 15. Что сознательно НЕ делаем в первой реализации

- сложную recommendation engine;
- ML/semantic search;
- real-time view counters;
- отдельный Elasticsearch/OpenSearch;
- перегруженную систему тегов с иерархией;
- client-side caching с избыточной сложностью.

Сначала нужен надёжный, быстрый и понятный discovery на Postgres + Prisma.

## 16. Риски и их нейтрализация

### Риск 1. Сломать текущие страницы книг и глав

Снижение риска:

- новые поля добавлять backward-compatible;
- старые endpoints не ломать;
- `Book` public identity внедрять через постепенный rollout.

### Риск 2. Слишком тяжёлый поиск

Снижение риска:

- search index;
- trigram/full-text;
- ограниченные result sets;
- pagination;
- денормализация.

### Риск 3. Рассинхрон метрик

Снижение риска:

- централизованный recalculation service;
- backfill/rebuild script;
- возможность периодического full rebuild.

### Риск 4. Путаница между продуктовой классификацией и ACL

Снижение риска:

- отдельно хранить join policy, visibility и search visibility;
- не использовать `UNDERGROUND` как permission flag.

## 17. Definition of Done для Phase 0

Phase 0 считается завершённой, когда:

- зафиксирована целевая модель данных;
- описан rollout order;
- определены новые API и DTO;
- определены инварианты discovery;
- зафиксировано, что именно является блокерами до UI.

## 18. Следующий шаг после Phase 0

После утверждения этого документа начинается реализация Phase 1:

- миграции схемы;
- каноническая публичная идентичность книг;
- новые book metadata;
- `BookMetrics`;
- `BookSearchDocument`;
- `BookReadState`;
- backfill scripts.

Это первый реальный технический пакет, без которого остальная discovery-логика будет либо временной, либо хрупкой.
