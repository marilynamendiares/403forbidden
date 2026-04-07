# 403FORBIDDEN — Refactor Masterplan

**Date:** 2026-03-30  
**Status:** active draft  
**Based on:** [PRODUCT_BIBLE_V2_2026_03_30.md](/Users/inokentykonovalov/projects/personal/403forbidden/docs/PRODUCT_BIBLE_V2_2026_03_30.md)

---

## 1. Purpose

Этот документ переводит product bible в практический план большого рефакторинга.

Цель рефакторинга:

- сделать проект стабильнее;
- сделать проект быстрее;
- очистить структуру;
- убрать хаотичные решения и дублирование;
- выровнять кодовую базу под реальную продуктовую модель проекта;
- подготовить надежную основу для `PAGER 03` и дальнейшего роста.

Это **не** план “переписать все сразу”.

Правильный подход:

- не ломать рабочие продуктовые слои без необходимости;
- не делать один гигантский unsafe-refactor;
- разбить работу на последовательные пакеты;
- после каждого пакета сохранять рабочее состояние проекта.

---

## 2. Refactor Principles

### 2.1. Product truth before code cleanup

Любая структурная чистка должна подчиняться product bible.

Нельзя рефакторить так, будто проект — это просто CRUD-приложение с красивой темой.  
Нужно учитывать:

- terminal + shell model;
- forum/arcs/world hierarchy;
- roles/access model;
- каноничную терминологию.

### 2.2. Preserve identity, clean implementation

Рефакторинг должен упростить реализацию, а не стереть характер проекта.

Неприкосновенные идеи:

- terminal как фундаментальный слой;
- shell как отдельная программа;
- асимметричный layout;
- arcs как gameplay-layer;
- world как отдельный archive/reference-layer.

### 2.3. Fix truth fragmentation

Одна из главных задач — уменьшить число мест, где “правда” о системе размазана по разным файлам и подходам.

Особенно это касается:

- access logic;
- naming;
- routes vs product terminology;
- data access;
- UI composition;
- docs.

### 2.4. Prefer canonical layers over ad-hoc glue

Если в проекте есть два способа делать одно и то же, должен остаться один каноничный путь.

Примеры:

- одна каноничная ACL-модель;
- один каноничный способ работать с DB;
- один каноничный naming standard;
- одна каноничная структура server/features/modules.

### 2.5. Delete dead weight aggressively, but deliberately

Удалять мусор нужно, но не хаотично.

Удаление оправдано, если файл:

- дублирует актуальную реализацию;
- остался после переименования;
- содержит больше неиспользуемый legacy route;
- мешает пониманию проекта;
- представляет собой временный артефакт без будущей ценности.

Если есть сомнение, файл лучше сначала пометить как cleanup candidate в рамках пакета, а не удалять вслепую.

---

## 3. Main Refactor Goals

### 3.1. Align codebase with product language

Нужно уменьшить разрыв между:

- `books` и `arcs`;
- `players` и `users`;
- shell/world/archive;
- application/profile;
- notification/pager/system mail.

### 3.2. Separate core modules cleanly

Нужно явно развести:

- forum;
- arcs;
- world;
- users;
- notifications;
- profile;
- economy/shop;
- shell infrastructure;
- auth/access.

### 3.3. Centralize access logic

Сейчас доступ и видимость частично размазаны между:

- role checks;
- page redirects;
- forum ACL;
- DB flags;
- route-specific logic.

Нужно получить единую access architecture.

Текущая зафиксированная рабочая матрица доступа:

- [ACCESS_MATRIX_V1_2026_03_31.md](/Users/inokentykonovalov/projects/personal/403forbidden/docs/ACCESS_MATRIX_V1_2026_03_31.md)

### 3.4. Reduce layout and route chaos

Нужно сделать структуру `app/` предсказуемой:

- что живет в shell;
- что живет вне shell;
- что является protected;
- что относится к terminal/world/fullscreen routes;
- что является reusable shell infrastructure.

### 3.5. Thin down bloated files

Часть файлов уже выглядит как смешение:

- UI;
- fetching;
- guards;
- mutation logic;
- presentational markup;
- product assumptions.

Это нужно разделить.

### 3.6. Prepare for Pager 03 without implementing it yet

Рефакторинг должен создать почву для:

- personal messaging;
- system inbox;
- cleaner notification boundaries;
- future message models.

---

## 4. What Must Not Be Broken

### 4.1. UX identity

Нельзя потерять:

- terminal background layer;
- shell-slide experience;
- world as fullscreen separate layer;
- асимметричную композицию shell.

### 4.2. Current access expectations

Нельзя сломать:

- restricted vs player separation;
- player gate through approved character;
- возможность restricted-user читать world;
- возможность restricted-user читать arcs;
- ограничения на полноценное участие без approval.

### 4.3. Core route intent

Нельзя потерять смысл:

- `/forum` как social entry;
- `/arcs` как gameplay/discovery;
- `/world` как lore/reference;
- `/users` как social population layer.

---

## 5. Current Problem Map

### 5.1. Naming inconsistency

Примеры:

- `Book` в модели, `Arcs` в продукте;
- старые упоминания `players`;
- частично устаревшие документы;
- разный язык между DB, server, routes и UI.

### 5.2. Access inconsistency

Примеры:

- forum policy частично в slug-sets, частично в DB fields;
- доступ размазан по layout, routes и helpers;
- недостаточно явно выражена матрица доступа по ролям.

### 5.3. Route/layout complexity without strict system map

Сейчас структура route groups уже несет смысл, но она не формализована как каноничная схема.

Это может привести к:

- неправильному размещению новых страниц;
- дублированию layouts;
- неправильной защите route groups;
- путанице между shell/fullscreen/protected flows.

### 5.4. Mixed responsibility files

Некоторые файлы совмещают слишком много обязанностей:

- data loading;
- UI state;
- product logic;
- route assumptions;
- rendering.

### 5.5. Legacy and placeholder drift

В проекте уже есть:

- legacy naming;
- placeholder pages;
- docs, не совпадающие с кодом;
- потенциальные cleanup candidates, мешающие понять актуальную систему.

---

## 6. Target Architecture Direction

Это не мгновенное изменение, а целевое направление.

### 6.1. App layer

`src/app/` должен отвечать за:

- route composition;
- layouts;
- page entrypoints;
- minimal route-local orchestration.

`app` не должен быть местом для размазанной бизнес-логики.

### 6.2. Feature/module layer

Проекту нужна более явная модульность по продуктовым областям.

Целевые домены:

- `forum`
- `arcs`
- `world`
- `users`
- `characters`
- `notifications`
- `pager` (future-ready)
- `shop`
- `shell`
- `auth/access`

### 6.3. Server/domain layer

`src/server/` должен быть очищен и разделен так, чтобы было понятно:

- где guards/access;
- где repos/query logic;
- где services/mutations;
- где contracts/dto;
- где realtime/events;
- где cross-cutting infra.

### 6.4. Shared UI/system layer

Нужно четко отделить:

- shell infrastructure;
- generic UI components;
- module-specific components;
- visual/system components вроде terminal/world hero/shell chrome.

---

## 7. Refactor Phases

### Phase 0. Inventory and safety rails

Цель:

- не начать рефакторинг вслепую.

Задачи:

- собрать список cleanup candidates;
- отметить legacy files;
- отметить placeholder files;
- зафиксировать, какие routes относятся к shell/fullscreen/protected;
- составить карту “что используется / что уже мертво”.

Результат:

- safe starting map;
- список файлов-кандидатов на удаление/перенос.

### Phase 1. Canon cleanup

Цель:

- выровнять базовую правду проекта.

Задачи:

- обновить документацию под новую product bible;
- удалить явно устаревшие документы и мусорные дубли;
- выровнять названия в docs;
- зафиксировать terminology rules.

Результат:

- docs перестают спорить с реальностью.

### Phase 2. Route and layout architecture cleanup

Цель:

- сделать route-layer понятным и устойчивым.

Задачи:

- формально разделить:
  - terminal/fullscreen routes;
  - shell routes;
  - protected shell routes;
  - auth/public flows;
- привести layout boundaries к ясной модели;
- убрать случайные размещения страниц не в тех route groups;
- зафиксировать правила: что может жить вне shell, а что нет.

Результат:

- понятная и расширяемая route architecture.

### Phase 3. Access and policy unification

Цель:

- получить один каноничный слой доступа.

Задачи:

- объединить forum ACL вокруг одной truth-model;
- убрать раздвоение slug policy vs DB policy;
- централизовать access helpers;
- сделать понятную матрицу:
  - guest;
  - restricted;
  - player;
  - admin.

Результат:

- меньше хаоса в guards;
- меньше риска случайных дыр;
- понятная future base для pager/private arcs/admin tools.

### Phase 4. Module boundary cleanup

Цель:

- очистить проектовые домены.

Задачи:

- разделить файлы по доменам;
- вынести feature-local UI из общих папок, если оно не shared;
- уменьшить размер перегруженных route files;
- вынести mutation/data logic из page files, где это уместно.

Результат:

- проект читается по продуктовым модулям, а не как хаотичный набор файлов.

### Phase 5. Arcs architecture cleanup

Цель:

- привести главный gameplay-layer в зрелое состояние.

Задачи:

- продолжить выравнивание `books`/`arcs` на уровне интерфейсов и naming;
- проверить arc/chapter/post flows;
- выделить settings/privacy/publicity concerns;
- подготовить точки расширения под:
  - min word settings;
  - turn-based posting;
  - free posting;
  - scheduled publishing.

Результат:

- arcs становятся устойчивой основой для дальнейшего роста.

### Phase 6. Shell infrastructure cleanup

Цель:

- укрепить главный UX-layer.

Задачи:

- отделить shell-system components от page-specific UI;
- упростить управление shell state/variant/surface/layout;
- проверить, где shell behavior слишком завязан на случайные компоненты;
- сделать shell architecture более очевидной для будущих добавлений.

Результат:

- легче поддерживать shell как core identity layer.

### Phase 7. Notifications/social/economy normalization

Цель:

- привести supporting systems в порядок до pager.

Задачи:

- зафиксировать границы notifications;
- привести users/presence logic к более чистой модели;
- проверить profile/shop/inventory boundaries;
- подготовить место для future communication architecture.

Результат:

- supporting systems перестают быть “прилипшими сбоку”.

### Phase 8. Pager-ready foundation

Цель:

- завершить refactor state так, чтобы можно было спокойно начинать pager.

Задачи:

- определить границы notifications vs inbox;
- подготовить каноничный домен для `pager`;
- убедиться, что access, layouts и shell уже не мешают его внедрению.

Результат:

- проект готов к `PAGER 03`.

---

## 8. Work Order Recommendation

Рекомендуемая реальная очередность:

1. Inventory and cleanup candidate map
2. Docs/naming cleanup
3. Route/layout cleanup
4. Access/policy unification
5. Shell infrastructure cleanup
6. Module boundary cleanup
7. Arcs cleanup
8. Notifications/users/shop cleanup
9. Pager-ready preparation

Причина такой очередности:

- сначала нужна карта и правда;
- затем каркас маршрутов и доступов;
- затем shell как core UX;
- затем домены и модульная чистка;
- потом уже поддерживающие системы.

---

## 9. Cleanup Candidates Categories

Ниже не список конкретных файлов, а категории мусора, которые нужно последовательно проверять.

### 9.1. Obsolete docs

Удалять или переписывать:

- устаревшие документы, противоречащие bible;
- временные заметки, утратившие смысл после появления canon docs.

### 9.2. Legacy routes

Удалять или переносить:

- старые naming-based маршруты;
- дублирующие endpoints;
- route leftovers от старой структуры.

### 9.3. Placeholder pages with no product value

Не все placeholders надо удалять.  
Но надо решить для каждого:

- временно оставить;
- упростить;
- перенести;
- удалить;
- пометить как future content shell.

### 9.4. Over-shared component dumping

Проверять:

- компоненты в общих папках, которые на деле принадлежат одному модулю;
- неясные utility files;
- компоненты со слабо читаемым назначением.

### 9.5. Generated and factual artifacts

Проверить, какие артефакты:

- реально нужны;
- должны быть в git;
- должны быть вынесены;
- должны быть пересобираемыми, а не хранимыми.

---

## 10. Naming Cleanup Rules

### 10.1. Product-first naming in UI/docs

В UI и docs использовать:

- `Arcs`
- `Users`
- `World`
- `Pager`

### 10.2. Technical names may stay in DB layer temporarily

Допускается временно сохранять:

- `Book`
- `BookMetrics`
- `BookReadState`

Но при контакте с продуктовым слоем naming должен быть осмысленным.

### 10.3. Avoid mixed naming in the same layer

Если файл относится к продуктовому UI-слою, он не должен одновременно говорить с пользователем на языке `book` и `arc`, если это не специально оговорено.

---

## 11. Success Criteria

Рефакторинг можно считать успешным, если после него:

- структура проекта читается быстрее;
- docs больше не спорят с кодом;
- naming consistency заметно лучше;
- доступ и видимость управляются предсказуемо;
- shell/world/forum/arcs границы ясны;
- добавление `PAGER 03` больше не выглядит опасным;
- проект ощущается как надежная система, а не накопленный прототип.

---

## 12. Immediate Next Step

Следующий практический шаг после этого masterplan:

сделать **Refactor Inventory Report**, в котором по факту репозитория будет составлен список:

- какие файлы являются legacy;
- какие файлы являются cleanup candidates;
- какие файлы надо переносить;
- какие домены перегружены сильнее всего;
- с какого пакета рефакторинга разумнее начинать прямо в коде.

Именно этот отчёт должен стать мостом от стратегии к первым реальным изменениям в проекте.
