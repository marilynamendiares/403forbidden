# 403Forbidden — Request / Query Observability Foundation v1

**Date:** 2026-04-07  
**Status:** active engineering foundation  
**Purpose:** зафиксировать первый реальный observability-слой проекта, чтобы Phase 1 hardening опиралась на измеримую server/request truth, а не на ощущения.

---

## 1. Strategic Verdict

У проекта теперь есть первый каноничный request/query observability foundation.

Это ещё не full observability platform и не complete performance memo, но уже есть главное:

- единый request-scoped timing layer;
- Prisma query visibility на уровне запроса;
- единый способ навешивать timing на hot API paths;
- slow-request и slow-query signal в server logs;
- управляемые env knobs для включения и порогов.

Именно с этого места теперь можно начинать уже не интуитивную, а измеримую работу по baselines и query audit.

---

## 2. What Is Implemented Now

## 2.1. Canonical Request Wrapper

В проекте введён единый route-level wrapper:

- `withRouteObservability(...)`

Его роль:

- открыть request scope;
- измерить полный request total;
- собрать ручные server timings внутри route;
- прикрепить observability headers к response;
- вывести structured slow-request signal в logs.

Это лучше, чем отдельные локальные замеры по месту, потому что теперь route не надо вручную собирать headers и помнить про финальный flush.

## 2.2. Prisma Query Aggregation

Через Prisma query events проект теперь собирает внутри активного request scope:

- query count;
- total query time;
- slowest query summary.

Это даёт минимально достаточную видимость для вопросов вида:

- запрос дорогой из-за DB или нет;
- есть ли много последовательных hops;
- какая query-shape доминирует внутри hot path.

## 2.3. Observability Headers

Когда observability включена, ответ может нести:

- `Server-Timing`
- `X-Observability-Query-Count`
- `X-Observability-Query-Time-Ms`
- `X-Observability-Slowest-Query`
- `X-Observability-Slowest-Query-Ms`

Эти headers нужны не как публичный API contract, а как инженерный диагностический слой для baseline collection и local/staging profiling.

## 2.4. Slow Path Logging

Если request или query превышает порог, сервер пишет structured warning с:

- HTTP status;
- request total;
- query count;
- total DB time;
- slowest query summary.

Это первый operational guardrail против ситуации “всё уже стало тяжёлым, но никто этого не заметил”.

## 2.5. Environment Controls

Введены следующие env knobs:

- `ENABLE_SERVER_TIMING`
- `OBSERVABILITY_SLOW_REQUEST_MS`
- `OBSERVABILITY_SLOW_QUERY_MS`

Канон:

- локально и на стендах observability можно включать осознанно;
- пороги не должны быть случайными;
- production включение должно происходить только осознанно, с пониманием log volume и profiling goals.

---

## 3. Current Instrumented Hot Paths

Ниже — routes, уже приведённые к каноничному observability contract.

### Forum

- `GET /api/forum/categories/[category]/threads`
- `POST /api/forum/categories/[category]/threads`
- `DELETE /api/forum/categories/[category]/threads/[slug]`
- `PATCH /api/forum/categories/[category]/threads/[slug]`
- `GET /api/forum/categories/[category]/threads/[slug]/posts`
- `POST /api/forum/categories/[category]/threads/[slug]/posts`

### Writer / Chapter

- `GET /api/arcs/[slug]/[index]`
- `PATCH /api/arcs/[slug]/[index]`
- `DELETE /api/arcs/[slug]/[index]`
- `GET /api/arcs/[slug]/[index]/posts`
- `POST /api/arcs/[slug]/[index]/posts`
- `GET /api/arcs/[slug]/chapters/[id]/posts`
- `POST /api/arcs/[slug]/chapters/[id]/posts`

### Discovery / Incidental Traffic

- `GET /api/arcs/discovery`
- `POST /api/presence/ping`
- `GET /api/notifications/count`

Это уже покрывает:

- social read/write;
- writer read/write;
- archive discovery;
- incidental background traffic.

То есть именно те зоны, которые и должны определять первую measured reality проекта.

---

## 4. What This Foundation Is For

Этот слой нужен не ради “красивых timings”.

Его практический смысл:

- подтвердить реальные baselines для budgets;
- понять, какие DB reads доминируют на forum/thread/chapter/discovery paths;
- увидеть sequential server hops;
- выявить incidental traffic inflation;
- не допускать деградации hot paths без сигнала.

Именно после этого можно уже профессионально обсуждать:

- query-shape cleanup;
- duplicate reads;
- pagination and cursor cost;
- reply/post create cost;
- background request discipline.

---

## 5. First Baseline Collection Canon

Первый baseline pass должен сниматься по следующим маршрутам:

- `GET /api/forum/categories/[category]/threads/[slug]/posts`
- `POST /api/forum/categories/[category]/threads/[slug]/posts`
- `GET /api/arcs/[slug]/chapters/[id]/posts`
- `POST /api/arcs/[slug]/chapters/[id]/posts`
- `GET /api/arcs/discovery`
- `POST /api/presence/ping`
- `GET /api/notifications/count`

Для каждого path нужно зафиксировать:

- request total;
- DB total;
- query count;
- slowest query;
- ручные stage timings внутри route;
- cold/warm qualitative difference, если она заметна.

Минимальный практический режим:

1. включить `ENABLE_SERVER_TIMING=1`
2. прогнать route несколько раз на тёплом локальном окружении
3. зафиксировать среднюю форму, а не единичный случайный пик
4. отдельно отметить выбросы и подозрительные query-shapes

### Collector

Для повторяемого baseline pass в репозитории теперь есть каноничный script:

- `pnpm run observability:baseline`

Script ожидает:

- `ENABLE_SERVER_TIMING=1`
- `BASELINE_BASE_URL`
- route-specific env values для `forum` / `arc` / `chapter`
- `BASELINE_COOKIE` для authenticated сценариев

Опционально:

- `BASELINE_SAMPLE_COUNT`
- `BASELINE_OUTPUT_PATH`

Смысл script не в полном synthetic load-test, а в аккуратном локальном или staging baseline capture по Phase 1 hot paths.

---

## 6. What Is Still Missing

Этот foundation ещё не закрывает всю задачу `Request And Query Observability`.

Остаётся сделать:

- отдельный baseline memo с уже измеренными значениями;
- query audit notes по главным hot paths;
- расширение observability на дополнительные routes, если они реально влияют на budgets;
- при необходимости richer request correlation for logs;
- дисциплину сравнения “до / после” при performance-sensitive changes.

То есть foundation уже есть, но measured audit phase только начинается.

---

## 7. Current Engineering Rules

Дальше project canon должен быть таким:

- новый hot path не должен оставаться полностью слепым;
- observability нужно расширять только на значимые routes, а не хаотично на всё подряд;
- каждый performance-sensitive refactor должен либо сохранять, либо улучшать measured shape;
- решения по forum/writer/discovery нельзя принимать только по субъективному ощущению скорости.

---

## 8. Leadership Verdict

С точки зрения Phase 1 это правильный переходный момент.

Проект уже не полностью слепой по server-side truth.

Следующий зрелый шаг теперь не “добавить ещё instrumentation ради instrumentation”, а:

- снять первые baselines;
- оформить query audit notes;
- на их основе принимать дальнейшие hardening-решения по `forum`, `writer`, `discovery`, `presence`, `notifications`.
