# 403FORBIDDEN — Product Bible v3

**Date:** 2026-04-03  
**Status:** active working canon  
**Purpose:** зафиксировать проект после первого большого рефакторинга уже не только как набор модулей и терминов, а как живую UX-систему, от которой дальше будет строиться performance review, polishing и следующие архитектурные решения.

---

## 1. Product Core

`403Forbidden` — это roleplay-платформа письменного формата, которая объединяет:

- социальный форум;
- совместное письмо через `arcs`;
- лорную энциклопедию `world`;
- системный интерфейс `terminal + shell`;
- профили, присутствие, уведомления, магазин и будущий `pager`.

Это не просто форум и не просто ficbook-площадка.  
Суть проекта — в связке:

- `forum` как точка входа в сообщество;
- `arcs` как главное пространство геймплея;
- `world` как слой погружения в мир;
- `terminal + shell` как главный интерфейсный опыт.

---

## 2. Product Identity

### 2.1. Что пользователь должен чувствовать

Пользователь должен чувствовать, что:

- он вошёл в скрытую систему;
- сайт не выглядит обычной веб-панелью;
- shell — это отдельная программа поверх более большого системного слоя;
- он не просто читает контент, а может стать участником мира;
- прохождение character gate действительно переводит его из наблюдателя в игрока.

### 2.2. Что здесь главное

Главное здесь не один модуль, а их связка:

- `forum` строит сообщество и вводит в проект;
- `arcs` дают основной roleplay/gameplay loop;
- `world` объясняет, ради чего всё это существует;
- `shell` делает сам опыт запоминающимся и атмосферным.

### 2.3. Что является ядром продукта

Если говорить прагматично, ядро продукта сейчас такое:

1. пользователь попадает в проект и ощущает terminal/shell identity;
2. читает форум, world и публичные arcs;
3. регистрируется и проходит character approval;
4. становится `player`;
5. создаёт или ведёт arc;
6. пишет главы и посты;
7. живёт внутри социальной и игровой системы.

---

## 3. Canon UX Model

## 3.1. Terminal Layer

Terminal — это фундаментальный фоновый слой.

Его задача:

- создавать ощущение системного входа;
- поддерживать brand identity проекта;
- быть постоянным низкоуровневым фоном;
- визуально существовать независимо от текущего shell-контента.

Terminal не обязан быть сложным функционально.  
Его ценность — атмосфера, ощущение “моста” в мир и цельность интерфейсной легенды.

## 3.2. Shell Layer

Shell — это основная интерактивная среда проекта.

Shell должен восприниматься как:

- отдельная программа;
- живая оболочка поверх terminal;
- место, где пользователь реально проводит время.

Внутри shell живут:

- forum;
- arcs;
- users;
- notifications;
- profile/settings;
- shop/inventory;
- позже pager.

### 3.3. Header / Mask / Sticky Truth

В shell есть важная визуальная и UX-модель:

- есть реальный header/topbar;
- под ним начинается scrollable content zone;
- контент может визуально уходить под fade-mask;
- некоторые sticky-элементы должны жить над маской, а не внутри обычного scroll-flow.

Это важно для:

- breadcrumb на arc/chapter страницах;
- sticky rail элементов;
- special sticky search bar на странице `arcs`.

Канон:

- sticky-элементы, которые должны “дожиматься” к header, не должны клипаться внутренним потоком;
- header должен существовать один раз, в одном месте;
- геометрия shell должна задаваться из одного каноничного слоя, а не из локальных магических offset’ов.

## 3.4. World Layer

`World` не обязан жить как ещё один экран внутри shell.

Он должен ощущаться как:

- архив;
- отдельная директория;
- полноэкранный lore/reference layer.

По важности сейчас `world` нужен для общей product truth, но не блокирует развитие gameplay и core systems.

---

## 4. Role Model

## 4.1. Guest

Незалогиненный пользователь.

Основная роль:

- первичное знакомство;
- чтение части публичной информации;
- ощущение атмосферы проекта.

## 4.2. Restricted

Залогиненный пользователь без approved character application.

Основная роль:

- наблюдатель;
- участник вступительного и социального слоя;
- потенциальный будущий player.

Может:

- читать доступные arcs;
- читать forum там, где разрешено;
- изучать world;
- общаться в вступительных/социальных зонах.

Не должен:

- полноценно участвовать в gameplay;
- создавать arcs;
- создавать gameplay-посты.

## 4.3. Player

Залогиненный пользователь с approved character application.

Это уже полноценный игровой участник.

Может:

- создавать arcs;
- создавать главы;
- публиковать игровые посты;
- участвовать в collaborative writing.

## 4.4. Admin

Администратор.

Роль:

- ручная модерация;
- approval персонажей;
- системные и контентные операции;
- поддержание работоспособности social/game layers.

---

## 5. Module Truth

## 5.1. Forum

`Forum` — это social entry layer.

Он нужен для:

- общения;
- знакомств;
- новостей;
- help/onboarding;
- организационного слоя.

Forum не является “лишним” слоем рядом с arcs.  
Он жизненно нужен для сообщества и удержания среды.

## 5.2. Arcs

`Arcs` — это core gameplay layer.

Именно здесь:

- ведутся истории;
- создаются главы;
- публикуются посты;
- происходит основное roleplay-взаимодействие.

Если forum — это пространство сообщества, то arcs — это пространство реальной игры.

## 5.3. World

`World` — это lore/reference layer.

Его задача:

- объяснить сеттинг;
- дать канон;
- углубить погружение.

Это важный продуктовый слой, но он не относится к самым частым и горячим путям нагрузки.

## 5.4. Users / Profiles / Presence

Это social-system layer.

Он нужен, чтобы проект ощущался как живая система, а не как набор отдельных страниц.

Сюда входят:

- `users`;
- публичные профили;
- собственный профиль;
- presence;
- inventory / cosmetics;
- notifications.

## 5.5. Pager

`Pager` — будущий communication layer.

Смысл:

- личка;
- системный inbox;
- more diegetic communication UX.

Сейчас важен как часть vision, но не должен ломать приоритеты ядра.

---

## 6. Current Flow Hierarchy

## 6.1. Entry Flow

Самый первый важный поток:

- landing / terminal impression;
- login / signup;
- вход в shell;
- первичный переход в forum / arcs / world.

Этот поток отвечает за:

- атмосферу;
- первое понимание проекта;
- конверсию в регистрацию и дальнейшее участие.

## 6.2. Social Flow

Следующий критический поток:

- forum index;
- category;
- thread;
- replies;
- notifications / unread;
- presence.

Этот поток удерживает сообщество даже тогда, когда пользователь не играет прямо сейчас.

## 6.3. Reader Flow

Критический discovery-поток:

- открыть `arcs`;
- использовать search/filters;
- открыть arc;
- открыть chapter;
- читать посты;
- отслеживать прогресс чтения.

Этот поток особенно важен для:

- новых restricted пользователей;
- observers;
- вовлечения через чужие истории.

## 6.4. Writer Flow

Самый важный gameplay-поток:

- открыть свою arc;
- редактировать intro и metadata;
- создавать главы;
- публиковать главы;
- писать посты;
- использовать lock/draft/reopen/status mechanics.

Это самый чувствительный поток для производительности и логики, потому что он самый “боевой”.

## 6.5. Character Gate Flow

Переходный поток:

- restricted user создаёт character application;
- редактирует анкету;
- submits;
- admin review;
- approval;
- restricted → player.

Это важный продуктовый gate, не просто административная формальность.

---

## 7. What Must Feel Fast

Для дальнейшего performance review каноном считаются следующие ощущения:

## 7.1. Должно ощущаться быстрым почти всегда

- shell open / close / shell navigation;
- forum category/thread loading;
- arc page loading;
- chapter page loading;
- отправка forum reply;
- отправка chapter post;
- editor lock heartbeat;
- notification count / basic notification feed;
- presence updates.

## 7.2. Может быть тяжелее, но не ломать UX

- arcs discovery ranking;
- advanced search/filter combinations;
- world pages с rich presentation;
- inventory/shop secondary views;
- admin moderation pages.

## 7.3. Допустимая truth-модель

Не всё должно быть строго мгновенно-консистентным.

Можно позволить eventual consistency для:

- discovery score / heat layers;
- some notification side-effects;
- non-critical counters;
- background rebuilds.

Но нельзя позволять разъезд для:

- lock ownership;
- posting rights;
- access checks;
- chapter status transitions;
- approval transitions.

---

## 8. Performance-Oriented Reading Of The Product

Следующий этап оптимизации должен смотреть на проект через вопрос:

“Какой пользовательский поток оплачивает каждый запрос?”

То есть:

- если запрос идёт на every page load, он должен быть особенно дешёвым;
- если запрос идёт на every key interaction, он должен быть максимально коротким;
- если запрос обслуживает редкий admin flow, он может быть тяжелее;
- если данные нужны только для decorative richness, их нельзя обрабатывать как hot-path truth.

### 8.1. Самые критичные hot paths

На текущем этапе я считаю самыми важными:

- forum thread reads/posts;
- chapter page load;
- chapter posts feed;
- create/edit/delete post;
- lock route;
- notification count/feed;
- arcs discovery viewer-context;
- presence ping/list;
- profile/avatar incidental traffic.

### 8.2. Что особенно важно избегать

- дублирующих ACL-проверок в разных слоях;
- дорогих повторных запросов ради тех же данных;
- retry-паттернов, маскирующих реальные ошибки;
- прямого server-page доступа в БД в обход service/repo layer;
- sticky/layout решений, завязанных на случайные offset-компенсации;
- client components, которые одновременно и UI, и transport, и orchestration, и business hints.

---

## 9. Current Architectural Truth

После первого рефакторинга канон такой:

- `app` pages = presentation + orchestration;
- `app/api` = transport layer;
- `server/services` = business logic;
- `server/repos` = read/query layer;
- shared hooks/lib = client transport and orchestration helpers;
- shell metrics and geometry = centralized;
- product naming = canonicalized around `arcs`, `users`, `/profile/settings`.

Это не означает, что проект идеален, но означает, что теперь он уже можно оптимизировать как систему, а не спасать как хаотичный прототип.

---

## 10. Design Locks

На текущий момент стоит считать жёсткими:

- terminal as always-present foundation;
- shell as right-side overlay program;
- header as single real geometry reference for sticky elements;
- fade-mask model for scroll content;
- breadcrumb / sticky rail / sticky search overlay logic above mask where intended;
- arcs/chapters split rail reading composition;
- shell width asymmetry and center-reading trick.

Нельзя бездумно ломать эти вещи ради упрощения кода.  
Если менять — то только более сильной реализацией той же идеи.

---

## 11. Current Priorities

После этого документа следующий приоритетный порядок вижу так:

1. `Project State Rescan` завершён этим документом
2. `Flow-Critical Performance Audit`
3. `Hot Path Optimization Packages`
4. `Selective UI Polishing`
5. затем уже новые крупные product systems

То есть сейчас не время хаотично изобретать новые фичи.  
Сейчас время:

- понять систему;
- измерить и прочитать её потоки;
- оптимизировать то, что реально определяет UX.

---

## 12. Recommended Next Step

Следующий сильный этап:

### `FLOW_CRITICAL_PERFORMANCE_AUDIT_V1`

Для каждого ключевого потока нужно отдельно разобрать:

- какие запросы выполняются;
- какие из них горячие;
- какие из них повторяются;
- какие должны быть агрегированы;
- какие должны быть кешируемы;
- какие должны быть SSR-first;
- какие должны быть realtime-driven;
- какие допустимо оставить eventual-consistent.

Рекомендуемый порядок аудита:

1. forum thread flow
2. chapter page + chapter posts flow
3. arcs discovery flow
4. notifications flow
5. presence + shell incidental traffic
6. character gate flow

Именно это даст следующий по-настоящему зрелый этап развития проекта.
