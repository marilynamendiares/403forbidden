# 403Forbidden — Observability Baseline Memo v1

**Date:** 2026-04-07  
**Status:** active measured memo  
**Purpose:** зафиксировать первые реальные baseline-замеры после внедрения request/query observability foundation, чтобы дальнейший hardening опирался уже на измеренные route timings.

---

## 1. Baseline Context

Замеры сняты на локальном dev runtime с:

- `ENABLE_SERVER_TIMING=1`
- `BASELINE_BASE_URL=http://localhost:3001`
- `BASELINE_SAMPLE_COUNT=3`

Использовался каноничный script:

- `pnpm run observability:baseline`

Отдельно важно:

- сервер был запущен в `next dev`, а не в production build;
- часть authenticated сценариев не снималась, потому что для них нужен валидный `BASELINE_COOKIE`;
- writer-by-id routes пока не были добавлены в measured pass, потому что для них нужен заранее выбранный валидный chapter target.

---

## 2. Measured Baselines

## 2.1. Forum Thread Read

Route:

- `GET /api/forum/categories/support/threads/help/posts`

Observed:

- average request total: `1704.5ms`
- max request total: `3210.5ms`
- average DB total: `1897.6ms`
- average query count: `3`
- average query time: `1897.6ms`
- slowest query seen: `FINDFIRST_ForumThread` at `2110.8ms`
- timing stages:
  - `route_params`
  - `viewer_session`
  - `forum_slice_read`
  - `db`
  - `request_total`

Reading:

- path уже реально измерим;
- и route, и DB shape сейчас выглядят тяжёлыми для forum hot path;
- baseline уже указывает не просто на “медленный route”, а на дорогой DB участок внутри thread fetch;
- это уже достаточно сильный сигнал для targeted query audit именно вокруг `ForumThread` / posts read model.

### Targeted Re-Read After Read-Path Split

После разрезания thread metadata lookup и post slice fetch на отдельные repo queries
чистый повторный local pass по тому же route показал:

- request totals: `2770.7ms`, `1097.8ms`, `584.8ms`
- DB totals: `2989.1ms`, `1307.8ms`, `688.5ms`
- query count: `4`
- cold slowest query: `FINDFIRST_ForumThread` at `1065.2ms`
- warm slowest query: `FINDMANY_ForumPost` at `644.3ms` and `348.3ms`

Interpretation:

- read path стал лучше диагностируемым;
- warm shape выглядит лучше, чем исходный тяжёлый combined fetch;
- но cost всё ещё остаётся слишком высокой для truly mature forum hot path;
- теперь следующий уровень аудита должен уже смотреть на:
  - thread lookup strategy;
  - post slice query cost;
  - interaction aggregation cost as a separate tail.

### Targeted Re-Read After Category-ID Cache

После добавления короткого TTL cache для `ForumCategory.slug -> id`
ещё один reread того же route показал:

- warm request total: `562.0ms`
- warm DB total: `558.3ms`
- warm query count: `3`
- warm slowest query: `FINDMANY_ForumPost` at `335.8ms`

Reading:

- cache убрал лишний category lookup из тёплого forum path;
- bottleneck теперь ещё чище локализован в:
  - `ForumPost` slice read
  - reputation aggregation tail
- это уже заметно лучше, чем предыдущее состояние, но всё ещё выше идеального целевого budget для elite-grade forum hot path.

### Targeted Re-Read After Global Cache Stabilization

После переноса forum read caches в `globalThis`
тёплый reread того же route показал уже более стабильную форму:

- warm request total: `450.9ms` and `448.9ms`
- warm DB total: `447.4ms` and `445.5ms`
- warm query count: `2`
- warm slowest query: `FINDMANY_ForumPost` at `336.1ms` and `334.4ms`

Reading:

- forum warm path теперь действительно удерживает cache benefit, а не теряет его на dev-runtime/HMR churn;
- category lookup и thread metadata lookup больше не участвуют в каждом тёплом чтении;
- главный remaining bottleneck теперь почти полностью сконцентрирован в:
  - `ForumPost` slice read
  - remaining interaction aggregation tail

### Targeted Re-Read After Public First-Slice Cache

После добавления cache на публичный first slice треда
повторный reread того же route показал:

- cold request total: `2774.0ms`
- cold DB total: `2756.7ms`
- cold query count: `4`
- warm request total: `3.4ms` and `3.0ms`
- warm `forum_slice_read`: `0ms`

Reading:

- публичный first-slice read-model теперь практически бесплатно повторно отдаётся на коротком окне TTL;
- это уже very strong gain для anonymous/high-repeat forum traffic;
- дальнейшая оптимизация теперь должна разделяться на два разных направления:
  - cold path cost reduction
  - correctness and invalidation discipline around the warm cache

## 2.2. Forum Category List

Route:

- `GET /api/forum/categories/support/threads`

Observed after public first-page cache wiring:

- cold request total: `1525.8ms`
- cold DB total: `1523.6ms`
- cold query count: `1`
- cold slowest query: `FINDMANY_ForumThread` at `1523.6ms`
- warm request total: `0.1ms` and `0.2ms`
- warm `forum_category_threads`: `0ms`

Reading:

- category list first page теперь имеет тот же short-TTL public snapshot pattern, что и thread first slice;
- write-path invalidation теперь обязана сбрасывать не только thread read-cache, но и category list cache, потому что new post / hide / lock меняют ordering и visibility;
- с точки зрения repeated anonymous traffic category entry path теперь практически бесплатен на тёплом окне;
- remaining cost здесь почти полностью cold-path only.

## 2.3. Arcs Discovery

Route:

- `GET /api/arcs/discovery`

Observed:

- average request total: `2449.6ms`
- max request total: `3240.8ms`
- average DB total: `n/a`
- average query count: `0`
- timing stages:
  - `viewer_session`
  - `arcs_discovery`
  - `request_total`

Reading:

- discovery path сейчас самый тяжёлый из реально снятых;
- даже с поправкой на dev runtime это already suspicious baseline;
- query summary здесь пока не проявилась, значит discovery path нужно дополнительно проверить на предмет data access shape или альтернативного read pipeline;
- discovery compose path явно заслуживает отдельного audit pass до дальнейшей полировки продукта.

### Targeted Re-Read After Public Discovery Cache

После добавления short-TTL public cache для unauth discovery path
повторный reread того же route показал:

- cold request total: `4021.1ms`
- cold DB total: `11273.2ms`
- cold query count: `5`
- cold slowest query: `FINDMANY_Arc` at `2540.8ms`
- warm request total: `6.6ms` and `3.3ms`
- warm `arcs_discovery`: `0.1ms` and `0ms`

Reading:

- unauth discovery repeat reads теперь практически не платят за expensive multi-query compose path;
- cold path остаётся явно дорогим, но теперь это уже isolated compose problem, а не постоянная цена каждого repeat open;
- measured query summary для discovery наконец подтверждена и показывает, что route действительно живёт на серии тяжёлых `Arc` reads, а не только на session overhead.

## 2.4. Notifications Count

Route:

- `GET /api/notifications/count`

Observed:

- average request total: `3.6ms`
- max request total: `4.8ms`
- average DB total: `n/a`
- average query count: `0`
- timing stages:
  - `viewer_session`
  - `request_total`

Reading:

- incidental unread path в unauth scenario сейчас выглядит очень дешёвым;
- отсутствие DB summary здесь ожидаемо, потому что в unauth scenario route рано возвращает `count: 0`;
- это хороший baseline, который дальше важно не испортить duplicate fetch ladders или лишними identity hops.

---

## 3. What Could Not Be Measured Yet

Пока не сняты:

- `POST /api/forum/categories/[category]/threads/[slug]/posts`
- `GET /api/arcs/[slug]/chapters/[id]/posts`
- `POST /api/arcs/[slug]/chapters/[id]/posts`
- `POST /api/presence/ping`

Причины:

- write paths и `presence` требуют authenticated session cookie;
- chapter-by-id baseline требует заранее выбранного валидного chapter target;
- measured pass сознательно не должен писать в случайные production-like данные без контролируемого target.

---

## 4. Current Gap Inside Observability

После повторного measured pass видно более точную картину:

- query summary layer уже подтверждена на `forum_thread_read`;
- `notifications_count` без query summary ожидаем в unauth scenario;
- `arcs_discovery` остаётся тяжёлым, но теперь уже с подтверждённой DB breakdown.

То есть главный remaining gap теперь уже более узкий:

- добрать authenticated write-path baselines;
- добрать chapter read/write baselines по валидному target.

---

## 5. Phase 1 Interpretation

На текущем этапе measured reality читается так:

- `notifications_count` пока безопасен;
- `forum_thread_read` уже требует более серьёзного внимания и теперь это подтверждено DB-level данными;
- `forum category list` теперь почти бесплатен на warm public path;
- `arcs_discovery` выглядит самым дорогим cold read path из измеренных, но warm unauth path уже почти бесплатен;
- query-level visibility уже подтверждена на обоих главных public read paths: `forum` и `discovery`.

То есть следующий инженерный шаг должен быть двойным:

1. добрать missing measured paths и discovery query truth
2. затем провести targeted audit по:
   - `arcs_discovery`
   - `forum thread read`

Именно в таком порядке, потому что без DB truth любое “ускорение” снова рискует стать интуитивным.

---

## 6. Next Step

Следующий правильный шаг после этого memo:

- доснять:
  - authenticated forum reply create
  - chapter read/write paths
  - presence ping
- отдельно проверить `arcs_discovery` query truth;
- после этого выпустить `Observability Baseline Memo v2` уже с полноценной request + query картиной.
