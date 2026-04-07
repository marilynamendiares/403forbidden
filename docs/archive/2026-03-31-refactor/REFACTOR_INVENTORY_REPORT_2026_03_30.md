# 403FORBIDDEN — Refactor Inventory Report

**Date:** 2026-03-30  
**Status:** active draft  
**Purpose:** фактическая инвентаризация репозитория перед началом рефакторинга.

---

## 1. Executive Summary

Репозиторий уже содержит рабочее ядро проекта, но вместе с ним накопились:

- артефакты среды и файловой системы;
- устаревшие документы;
- naming drift;
- placeholder-страницы;
- дубли и конкурирующие UX-пути;
- смешение продуктовых и технических имен;
- перегруженные файлы;
- незавершенные новые зоны, которые уже нельзя принимать за мусор автоматически.

Главный вывод:

- проект **не нуждается в одном разрушительном “генеральном сносе”**;
- но нуждается в **жесткой сортировке** на:
  - актуальное ядро;
  - незавершенные, но ценные зоны;
  - явный мусор;
  - legacy/redirect leftovers;
  - файлы, требующие декомпозиции.

---

## 2. Important Safety Note

Рабочее дерево уже **грязное** и содержит незакоммиченные изменения и новые файлы.

Это значит:

- часть файлов выглядит новой и еще не закрепленной;
- часть старых выводов из ранней документации уже не совпадает с реальным кодом;
- нельзя автоматически удалять всё, что кажется лишним, без локальной сверки.

Особенно это касается:

- `src/app/api/arcs/*`
- `src/components/arcs/*`
- `src/server/arcs/*`
- `src/server/repos/arcs*`
- новых миграций и discovery-related изменений

Эти зоны выглядят как **активно развиваемый слой**, а не мусор.

---

## 3. Repository State by Category

### 3.1. Canon docs now present

Актуальными опорными документами можно считать:

- `docs/PRODUCT_BIBLE_V2_2026_03_30.md`
- `docs/REFACTOR_MASTERPLAN_2026_03_30.md`

Их уже достаточно, чтобы вести рефакторинг осмысленно.

### 3.2. Docs that are still useful but not canonical

Оставить как supporting docs:

- `docs/ARCHITECTURE.md`
- `docs/ARCS_DISCOVERY_PHASE0.md`
- `docs/ARCS_DISCOVERY_PHASE6_PLUS.md`

Они полезны, но не должны считаться верхнеуровневой продуктовой правдой.

### 3.3. Docs that are stale or partly stale

Под вопросом:

- `docs/NEXT_PRODUCT_PHASES.md`
- `docs/_facts/project_state_master_2026_02_02.md`
- `docs/_facts/git-files.txt`
- `docs/_facts/tree.current.txt`
- `docs/_facts/tree.git.txt`

Причина:

- часть из них уже противоречит текущей терминологии и структуре;
- `_facts/*` больше похоже на исторические снапшоты, чем на активную документацию.

Решение на будущее:

- либо перенести их в отдельный historical/archive docs namespace;
- либо удалить то, что не несет ценности.

---

## 4. High-Confidence Cleanup Candidates

Это то, что с высокой вероятностью можно удалять или убирать одним из первых пакетов.

### 4.1. `.DS_Store`

В репозитории много `.DS_Store`, включая:

- корень проекта;
- `docs/`;
- `src/`;
- `public/`;
- `prisma/`;
- многие вложенные каталоги внутри `src/app`.

Они не несут продуктовой ценности и засоряют дерево.

Статус:

- **удалить**
- усилить контроль через `.gitignore`

### 4.2. Empty root artifacts

В корне лежат пустые файлы:

- `Build`
- `next`
- `403forbidden@0.1.0`

Из них как минимум:

- `next`
- `403forbidden@0.1.0`

уже tracked git’ом.

Это выглядит как явный файловый мусор/артефакты среды.

Статус:

- **очень сильные кандидаты на удаление**

### 4.3. `README.md`

Сейчас `README.md` — шаблонный next.js файл и не отражает проект.

Статус:

- **не удалить**, а **полностью переписать**

### 4.4. `docs/.DS_Store`, `src/.DS_Store`, `prisma/.DS_Store`, `public/.DS_Store`

То же самое: мусор без ценности.

Статус:

- **удалить**

---

## 5. Legacy / Redirect / Transitional Candidates

Это не обязательно мусор, но текущая форма не должна считаться финальной.

### 5.1. `/archive`

Текущий route:

- `src/app/(shell)/archive/page.tsx`

Фактически просто редиректит на `/world`.

Это значит:

- route не является самостоятельным модулем;
- он существует как transitional leftover.

Статус:

- **legacy candidate**

Варианты:

- временно оставить как backward-compat redirect;
- позднее удалить, если route больше нигде не нужен.

### 5.2. `project_state_master`

`docs/_facts/project_state_master_2026_02_02.md` ценен как историческая фотография, но уже не канон.

Статус:

- **historical doc**

Варианты:

- перенести в `docs/archive/` или `docs/_history/`;
- либо оставить в `_facts`, но явно обозначить как stale snapshot.

### 5.3. `NEXT_PRODUCT_PHASES.md`

Файл противоречит новой последовательности:

- рефакторинг уже приоритетнее pager.

Статус:

- **нужен rewrite или archive**

---

## 6. Placeholder Inventory

### 6.1. World placeholders

Практически весь `world` кроме index и shop находится в placeholder-состоянии:

- `src/app/(full)/world/lore/page.tsx`
- `src/app/(full)/world/timeline/page.tsx`
- `src/app/(full)/world/factions/page.tsx`
- `src/app/(full)/world/locations/page.tsx`
- `src/app/(full)/world/map/page.tsx`
- `src/app/(full)/world/systems/rules/page.tsx`
- `src/app/(full)/world/systems/mechanics/page.tsx`
- `src/app/(full)/world/systems/faq/page.tsx`

Это не мусор, но это и не полноценные продуктовые страницы.

Статус:

- **оставить**, но пометить как `future-content placeholders`

Решение:

- не удалять сейчас;
- возможно позже унифицировать через общий placeholder template или CMS/content-driven pattern.

### 6.2. Forum news placeholders

Есть заготовки:

- `src/app/(shell)/forum/news/public/page.tsx`
- `src/app/(shell)/forum/news/players/page.tsx`
- `src/app/(shell)/forum/news/devlog/page.tsx`

Сейчас они содержат `TODO` и не имеют реального feed layer.

Статус:

- **оставить как product stubs**

Риск:

- визуально модуль уже существует, фактически — нет.

### 6.3. Pager placeholder

- `src/app/(shell)/pager/page.tsx`

Статус:

- **оставить**

Причина:

- это осознанно зарезервированная top-level зона для будущего core module.

---

## 7. Duplicate / Confusing UX Paths

### 7.1. Profile duplication

Сейчас одновременно существуют:

- `src/app/(shell)/profile/page.tsx`
- `src/app/(shell)/settings/profile/page.tsx`

Они обслуживают близкую область, но выглядят как два разных UX-пути.

Риск:

- дублирование логики;
- непонятно, какой экран каноничный;
- возможный drift между simple-profile и settings-profile model.

Статус на момент отчета:

- требовало продуктового и архитектурного объединения

Обновление после Package B:

- canonical path выбран как `/profile/settings`
- `/profile` и `/settings/profile` переведены в alias/redirect

### 7.2. Users naming residue

Несмотря на каноничное `/users`, локально ещё остались имена:

- `players-table.tsx`
- локальные переменные `isPlayer`, `kind: "player"`

Это не ошибка само по себе, но сейчас naming смешивает:

- продуктовое имя экрана;
- ролевой статус;
- старую историю названия.

Статус:

- **naming cleanup candidate**

### 7.3. Arcs/book mixed language

По UI и docs модуль уже `arcs`, но в коде остаются:

- `books` API routes;
- `Book*` компоненты;
- `services/books.ts`;
- уведомления и server-layer на `book` naming.

Это ожидаемо, но уже нужно приводить к осмысленной схеме.

Статус:

- **major naming alignment task**

---

## 8. Access / Policy Inconsistency

### 8.1. Forum ACL split truth

Сейчас truth размазана между:

- `src/server/forumAcl.ts`
- DB fields в `ForumCategory`
- route-level assumptions

Это один из самых явных архитектурных косяков.

Статус:

- **high-priority refactor target**

### 8.2. Protected arcs vs intended restricted read access

Product truth уже говорит:

- restricted-user должен читать арки;
- но полноценно участвовать не должен.

Текущая архитектура protected layout требует `PLAYER` для доступа к arcs route-group.

Это значит:

- продуктовая модель и route protection сейчас потенциально конфликтуют.

Статус на момент отчета:

- critical product/architecture mismatch

Обновление после Package C:

- `arcs` route-group уже открыт для logged-in users;
- создание арок отдельно закрыто `PLAYER`-gate;
- restricted-users получили read-only путь к public arcs;
- полная truth-модель private/public arc access всё ещё требует дальнейшей реализации.

---

## 9. Large / Overloaded Files

Ниже файлы, которые уже выглядят перегруженными и/или просят декомпозиции.

### 9.1. UI-heavy / mixed files

- `src/components/arcs/ArcsDiscoveryClient.tsx`
- `src/components/ChapterEditorClient.tsx`
- `src/components/world/WorldHero.tsx`
- `src/app/(shell)/(protected)/arcs/[slug]/[index]/page.tsx`
- `src/app/(shell)/(protected)/arcs/[slug]/page.tsx`
- `src/components/chapter/ChapterIntroClient.tsx`
- `src/app/(shell)/settings/profile/page.tsx`
- `src/app/SidebarFrame.tsx`

Причины:

- большой объём;
- смешение рендеринга, состояния, product assumptions и orchestration;
- высокий cognitive load.

Статус:

- **decomposition candidates**

### 9.2. Server-heavy files

- `src/server/arcs/discoveryFoundation.ts`
- `src/server/repos/arcsCatalog.ts`
- `src/server/repos/chapters.ts`
- `src/server/services/chapters.ts`
- `src/server/services/notifications.ts`

Статус:

- **refactor candidates**

Особенно важно:

- уменьшать размер без потери ясности доменной модели.

---

## 10. Module Boundary Issues

### 10.1. `src/components/` contains both shared and domain-specific UI

Сейчас в `src/components/` лежит всё вперемешку:

- truly shared UI;
- world-specific;
- book/arcs-specific;
- chapter-specific;
- notification-specific;
- shell-adjacent pieces.

Частично это уже исправлено через подпапки:

- `arcs/`
- `book/`
- `chapter/`
- `editor/`
- `world/`

Но границы все ещё не доведены до конца.

Статус:

- **medium-high priority cleanup**

### 10.2. `src/features/` is underused

`src/features/` существует, но покрывает очень малую часть проекта:

- chapters live UI
- forum live UI
- realtime bus/hook

Сейчас он не является реально каноничным модульным слоем.

Это создаёт ощущение полу-внедренной архитектурной идеи.

Статус:

- **architectural decision point**

Нужно решить:

- либо действительно развивать feature-first структуру;
- либо не держать её как полумеру.

### 10.3. Server domains partially clean, partially ad-hoc

`src/server/arcs/*` уже выглядит как новая более взрослая структура.  
Но многие другие домены ещё не выровнены на таком же уровне.

Статус:

- **positive direction, but incomplete rollout**

---

## 11. Generated / Build / Environment Artifacts

### 11.1. `src/generated/prisma`

В проекте есть `src/generated/prisma/*`.

В `.gitignore` уже есть:

- `/src/generated/prisma`

Это значит:

- директория должна считаться generated;
- её не стоит анализировать как handwritten code;
- при cleanup важно убедиться, что она действительно не нужна в git.

Статус:

- **generated artifact**

### 11.2. Root build artifacts

В корне есть:

- `.next`
- `node_modules`
- пустые root files
- `tsconfig.tsbuildinfo`

Это всё не относится к рефакторингу логики, но относится к гигиене рабочего дерева.

### 11.3. Prisma migrations

Миграции выглядят осмысленными и живыми.  
Их нельзя считать мусором.

Однако:

- есть `.DS_Store` внутри `prisma/migrations`;
- есть подозрительная миграция `20251106101035_` с пустоватым именем, которую позже стоит проверить отдельно.

Статус:

- **mostly keep**
- одна точка на ручную проверку

---

## 12. Concrete Candidate Lists

### 12.1. Strong delete candidates

- все `.DS_Store` внутри репозитория;
- пустые root files:
  - `Build`
  - `next`
  - `403forbidden@0.1.0`

### 12.2. Strong rewrite candidates

- `README.md`
- `docs/NEXT_PRODUCT_PHASES.md`

### 12.3. Strong archive-or-mark-stale candidates

- `docs/_facts/project_state_master_2026_02_02.md`
- `docs/_facts/git-files.txt`
- `docs/_facts/tree.current.txt`
- `docs/_facts/tree.git.txt`

### 12.4. Strong decomposition candidates

- `src/app/(shell)/(protected)/arcs/[slug]/page.tsx`
- `src/app/(shell)/(protected)/arcs/[slug]/[index]/page.tsx`
- `src/components/arcs/ArcsDiscoveryClient.tsx`
- `src/components/ChapterEditorClient.tsx`
- `src/app/SidebarFrame.tsx`
- `src/app/(shell)/settings/profile/page.tsx`

### 12.5. Strong architecture-review candidates

- `src/server/forumAcl.ts`
- `src/app/(shell)/(protected)/layout.tsx`
- `src/app/(shell)/profile/page.tsx`
- `src/app/(shell)/settings/profile/page.tsx`
- `src/features/*` as a structural concept

---

## 13. Recommended First Code Cleanup Package

Первый безопасный пакет реальных изменений стоит сделать не про бизнес-логику, а про hygiene + clarity.

### Package A

- удалить `.DS_Store`;
- удалить пустые root artifacts;
- переписать `README.md`;
- явно пометить stale docs или перенести их в historical namespace;
- зафиксировать в docs, что `_facts/*` — это historical snapshots, а не truth.

Почему именно так:

- почти нулевой риск сломать функционал;
- сразу чище дерево;
- снижается шум перед более опасными пакетами.

---

## 14. Recommended Second Cleanup Package

### Package B

- решить судьбу `/archive`;
- выбрать каноничный profile route/path;
- начать naming cleanup вокруг `users` и `arcs`;
- подготовить отдельный refactor пакет для access unification.

Почему это следующий шаг:

- это уже влияет на продуктовую ясность;
- но ещё не требует ломать deeply nested gameplay logic.

---

## 15. Most Important Finding

Самое важное наблюдение по фактическому состоянию репозитория:

проект уже начал переход от хаотичного MVP к более зрелой модульной системе, **но переход выполнен неравномерно**.

Лучший пример:

- `arcs` уже двигаются в сторону более зрелой структуры;
- forum access ещё живет в раздвоенной truth-model;
- shell — сильный core layer, но ещё не полностью отделён как инфраструктурный модуль;
- world уже имеет продуктовый смысл, но ещё не имеет содержательного наполнения;
- users/profile/settings naming и UX ещё требуют выравнивания.

То есть:

- проект уже не хаос целиком;
- но сейчас в нём живут одновременно старый и новый архитектурные режимы.

Именно это и нужно разбирать по пакетам.
