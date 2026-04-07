# ARCS Discovery Phase 6+

Техническая дорожная карта развития `/arcs` после foundation, первых discovery API и первой версии UI.

Статус: active / implementation roadmap

## 1. Цель

Довести discovery-систему `/arcs` от рабочей первой версии до более зрелого уровня по:

- скорости;
- предсказуемости;
- качеству поиска;
- точности ranking;
- качеству исходных метаданных;
- полезности персонализации.

Этот этап не добавляет случайные фичи поверх уже работающей страницы. Он последовательно усиливает те части системы, которые уже были введены, но пока реализованы в упрощённой или слишком тяжёлой форме.

## 2. Главные направления улучшения

Ниже зафиксированы пять приоритетов, которые считаются обязательными.

### 2.1. Меньше повторных запросов

Текущее состояние:

- discovery-страница повторно собирает viewer-context;
- card mapping повторно тянет участников, follows и participant-set;
- часть Prisma `select`-блоков продублирована между секциями.

Цель:

- один viewer-context на весь запрос;
- одна сборка participant-map на объединённый список книг;
- единые shared selects и shared mappers;
- thinner repo files.

### 2.2. Правильная пагинация

Текущее состояние:

- каталог использует разные `sort`, но курсор пока не полностью согласован с конкретным порядком сортировки.

Цель:

- отдельный канонический cursor payload на каждый mode сортировки;
- отсутствие дублей и пропусков между страницами;
- корректная работа `Load More`.

### 2.3. Сильнее поиск

Текущее состояние:

- поиск строится через `contains` по `combinedText`;
- fuzzy search и ranking пока носят только базовый характер.

Цель:

- перейти на Postgres FTS + trigram;
- добавить weighted ranking по разным зонам search document;
- улучшить качество выдачи по title, users, tags и fragments.

### 2.4. Дешевле обновление metrics

Текущее состояние:

- важные мутации арок часто приводят к полному rebuild discovery foundation по книге;
- это будет слишком дорого при росте количества постов.

Цель:

- разделить `full rebuild` и `incremental update`;
- оставить полный rebuild для repair/backfill/migration;
- на обычных пользовательских действиях обновлять только нужные счётчики.

### 2.5. Лучше качество исходных метаданных

Текущее состояние:

- discovery already exists, but many arcs still have weak metadata;
- hook, summary, format, visibility and tags are not yet fully editable and curated from product UI.

Цель:

- дать аркам полноценный metadata editor;
- сделать discovery data более качественным, а не случайным;
- подготовить почву для сильного поиска и ranking.

## 3. Phase 6: Performance / Cleanup Pass

### 3.1. Цель phase

Убрать лишнюю тяжесть и дублирование в discovery-слое без изменения пользовательской логики.

### 3.2. Работы

- разнести текущий monolith repo на smaller modules;
- вынести shared Prisma selects;
- вынести viewer-context;
- вынести card mapper;
- устранить повторные запросы при формировании discovery sections;
- подготовить repo layer к следующим фазам.

### 3.3. Целевая структура

Рекомендуемое разбиение:

- `src/server/arcs/arcSelects.ts`
- `src/server/arcs/viewerContext.ts`
- `src/server/arcs/cardMapper.ts`
- `src/server/repos/arcsCatalog.ts`
- `src/server/repos/arcsDiscovery.ts`
- `src/server/repos/arcs.ts` как thin facade

### 3.4. Результат

- меньше SQL на одну загрузку `/arcs`;
- cleaner server code;
- проще внедрять Phase 7 и 8.

## 4. Phase 7: Correct Cursor Pagination

### 4.1. Цель phase

Сделать каталог устойчивым и корректным при `recent`, `trending`, `new`.

### 4.2. Работы

- ввести отдельные cursor payload для разных sort modes;
- выровнять `orderBy` и `where after cursor`;
- обработать `null` values для activity sorting;
- добавить тестовые сценарии на дубли и пропуски.

### 4.3. Результат

- стабильный `Load More`;
- отсутствие рассинхронизации между pages.

## 5. Phase 8: Search V2

### 5.1. Цель phase

Поднять поиск до уровня реального discovery tool.

### 5.2. Работы

- добавить Postgres `tsvector`;
- добавить `GIN` index;
- добавить `pg_trgm` для fuzzy совпадений;
- ввести weighted ranking:
  - title
  - tags
  - participants
  - hook/summary
  - chapter titles
  - post fragments
- улучшить query normalization.

### 5.3. Результат

- поиск становится точнее;
- поиск лучше масштабируется;
- выдача становится продуктово осмысленной.

## 6. Phase 9: Incremental Metrics Pipeline

### 6.1. Цель phase

Сделать обновление discovery-метрик дешёвым на обычных действиях пользователя.

### 6.2. Работы

- разделить pipeline на:
  - full rebuild
  - incremental updates
- покрыть incremental handlers для:
  - post created
  - post deleted
  - like/unlike
  - reputation grant
  - follow/unfollow
  - chapter publish
- оставить full rebuild для:
  - repair
  - migration
  - backfill

### 6.3. Результат

- меньше нагрузки на БД;
- быстрее обычные мутации;
- foundation не становится bottleneck.

## 7. Phase 10: Arc Metadata Editor

### 7.1. Цель phase

Дать пользователю и редакторскому слою управлять discovery-важными полями арки.

### 7.2. Поля

- `title`
- `tagline`
- `hook`
- `summary`
- `status`
- `format`
- `joinPolicy`
- `visibility`
- `searchVisibility`
- `allowDiscovery`
- tags

### 7.3. Результат

- более качественные карточки;
- более полезный поиск;
- более точные фильтры.

## 8. Phase 11: Metadata Quality Layer

### 8.1. Цель phase

Не дать метаданным расползтись в хаотичный набор строк.

### 8.2. Работы

- ввести canonical tag dictionary;
- нормализовать tag slugs;
- ограничить мусорные/дублирующиеся теги;
- при необходимости добавить tag groups.

### 8.3. Результат

- чище каталог;
- лучше search relevance;
- меньше мусора в UI.

## 9. Phase 12: Continue Reading V2

### 9.1. Цель phase

Сделать персонализацию более точной и менее шумной.

### 9.2. Работы

- перестать писать read-state просто на mount;
- добавить threshold реального чтения;
- возвращать пользователя точнее в нужную главу/пост;
- разделить `recently opened` и `continue reading`.

### 9.3. Результат

- полезнее `Continue Reading`;
- меньше случайного шума.

## 10. Phase 13: Discovery Ranking Tuning

### 10.1. Цель phase

Сделать `Top`, `Recent`, `New` и activity buckets не просто техническими выборками, а качественным ranking layer.

### 10.2. Работы

- тюнинг `heatScore`;
- refinement activity buckets;
- отдельная логика для `new` vs `abandoned`;
- возможное добавление views позже, если они действительно нужны продукту.

### 10.3. Результат

- discovery sections ощущаются curated, а не случайными.

## 11. Рекомендуемый порядок внедрения

Рекомендуемый порядок реализации:

1. `Phase 6` Performance / Cleanup Pass
2. `Phase 7` Correct Cursor Pagination
3. `Phase 10` Arc Metadata Editor
4. `Phase 8` Search V2
5. `Phase 9` Incremental Metrics Pipeline
6. `Phase 12` Continue Reading V2
7. `Phase 11` Metadata Quality Layer
8. `Phase 13` Discovery Ranking Tuning

### Почему именно так

- сначала делаем систему легче и чище;
- потом исправляем correctness-problems;
- потом улучшаем качество исходных данных;
- только после этого усиливаем search и ranking;
- expensive metrics work переносим на этап, где foundation уже не перегружен архитектурно.

## 12. Definition of Success

Roadmap Phase 6+ считается успешно реализуемым, если:

- `/arcs` делает меньше повторных запросов;
- catalog pagination стабильна;
- search больше не ограничен простым `contains`;
- metrics не требуют полного rebuild на каждый чих;
- arc cards получают более качественные и осмысленные metadata;
- personalization становится точнее;
- дальнейшее развитие discovery больше не упирается в перегруженный monolith code.
