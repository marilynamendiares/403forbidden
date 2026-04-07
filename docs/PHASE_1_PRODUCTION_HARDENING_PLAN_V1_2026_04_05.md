# 403Forbidden — Phase 1 Production Hardening Plan v1

**Date:** 2026-04-05  
**Status:** active implementation plan  
**Purpose:** описать следующий логичный этап разработки после рефакторинга и performance packages, исходя из продуктового вектора: сделать проект более большим, зрелым, быстрым и надёжным, прежде чем активно наращивать новые продуктовые слои.

---

## 1. Why This Is The Next Step

Сейчас проект уже выпрямлен архитектурно, но всё ещё ощущается “сырым и голым” не потому, что мало красивого UI, а потому что ему не хватает эксплуатационной зрелости.

Самый опытный следующий шаг — не бросаться в новые крупные фичи, а заложить жёсткую базу под:

- масштабируемость `forum`;
- надёжность writer flow;
- предсказуемость shell и realtime;
- безопасную дальнейшую разработку без regressions.

Именно поэтому Phase 1 должна быть про hardening, budgets и observability.

---

## 2. Phase 1 Goal

Перевести проект из состояния:

- “архитектура уже хорошая”

в состояние:

- “проект измерим, контролируем и безопасен для дальнейшего роста”.

---

## 3. Phase 1 Workstreams

## W1. Performance Budgets

Нужно зафиксировать целевые бюджеты для самых важных потоков.

### Budget Targets

- `forum thread first render`
- `forum reply submit perception`
- `chapter page first render`
- `chapter post submit perception`
- `arcs discovery first render`
- `presence/notifications incidental traffic`
- `shell intra-app navigation perception`

### Output

Один каноничный документ с budgets и правилами, что считается регрессией.

## W2. Request And Query Observability

Нужно добавить недостающий слой видимости:

- какие server-side flows дорогие;
- где много последовательных hops;
- где фоновые запросы плодятся без нужды;
- какие Prisma queries реально доминируют на hot paths.

### Output

- server-side timing hooks
- request profiling helpers
- query audit notes for main flows

## W3. Smoke Test Matrix

Нужно определить небольшой, но жёсткий набор smoke flows:

- signup / verify / login
- restricted -> player gate basics
- forum open thread / reply / delete own post
- arc open / chapter open / create chapter post
- unread notifications update
- shell navigation critical screens

### Output

Минимальный набор повторяемых проверок, которые можно запускать перед крупными изменениями.

## W4. Forum Scale Foundation

Поскольку именно `forum` — главный риск под живую нагрузку, уже в этой фазе нужно подготовить:

- индексный и cursor review forum posts
- moderation-ready model notes
- read/write path measurements
- contract review для thread and reply hot paths

### Output

Отдельный hardening memo для forum scale.

## W5. Writer Reliability Foundation

Даже если forum массовее, `writer` path ценнее по контенту.

В этой фазе нужно не redesign, а hardening:

- lock reliability review
- draft recovery review
- post/intro/editor failure modes
- multi-tab safety notes

### Output

Writer reliability memo и список high-risk failure points.

---

## 4. Immediate Implementation Order

Эту фазу нужно идти не абстрактно, а в таком порядке:

1. `Performance Budgets v1`
2. `Request/Query Observability foundation`
3. `Smoke Test Matrix v1`
4. `Forum Scale Review memo`
5. `Writer Reliability Review memo`

Это лучший порядок, потому что:

- он сначала даёт инструменты измерения;
- потом даёт минимальный защитный контур;
- и только потом углубляется в forum/writer risk zones.

---

## 5. What Must Not Happen In This Phase

Чтобы не сломать приоритет, в этой фазе нельзя распыляться на:

- большой визуальный редизайн;
- переработку `world` ради атмосферы;
- старт полноценного `pager`;
- случайные feature additions без отношения к hardening;
- бесконечную мелкую полировку неcritical экранов.

Это всё позже.

Сейчас цель — сделать проект сильнее внутри.

---

## 6. Success Criteria

Phase 1 можно считать завершённой, когда:

- у главных потоков есть понятные budgets;
- у проекта есть минимальная, но реальная smoke-discipline;
- известны и зафиксированы самые дорогие server paths;
- `forum` имеет инженерную карту масштабирования;
- `writer flow` имеет инженерную карту надёжности;
- дальнейшая работа может идти уже не “на ощущениях”, а по measured reality.

---

## 7. Next Step After Phase 1

После завершения этой фазы следующим этапом должен стать:

**Phase 2 — Forum And Social Scale Maturity**

Потому что именно forum у проекта является самым вероятным местом будущей высокой нагрузки и самой массовой пользовательской активности.
