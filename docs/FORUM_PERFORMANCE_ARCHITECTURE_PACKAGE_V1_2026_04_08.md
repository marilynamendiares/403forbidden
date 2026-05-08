# 403Forbidden — Forum Performance Architecture Package v1

**Date:** 2026-04-08  
**Status:** active architecture package  
**Purpose:** зафиксировать целевую performance-архитектуру `forum` как high-traffic social layer, чтобы дальнейшая оптимизация шла не серией случайных локальных улучшений, а как управляемая модульная стратегия.

---

## 1. Strategic Verdict

`Forum` уже достаточно важен для проекта, чтобы оптимизироваться не только route-by-route, а как отдельная производительная система.

Это значит:

- у него должны быть явные read-model contracts;
- у него должны быть явные cold / warm budgets;
- кэширование должно быть осознанным, а не “по месту”;
- invalidation должна проектироваться как часть архитектуры, а не как побочный эффект;
- write paths не должны ломать read-speed truth.

Именно такой уровень дисциплины нужен, если `forum` действительно должен выдерживать живой социальный трафик.

---

## 2. Module Performance Truth

С точки зрения performance `forum` сейчас состоит не из “страниц”, а из четырёх основных горячих потоков:

1. category list
2. thread first slice
3. thread continuation / tail fetch
4. thread reply / interaction mutations

Оптимизировать их нужно по-разному.

---

## 3. Canon Read Contracts

## 3.1. Category List Contract

Category list должен быть:

- дешёвым;
- activity-ordered;
- moderation-aware;
- пригодным к повторным быстрым открытиям.

Канон:

- ordering по `lastActivityAt`;
- не дёргать лишние relation chains для каждого треда;
- category/thread listing должен иметь собственный measured budget, а не жить как побочный экран.

## 3.2. Thread First Slice Contract

Thread first slice — главный social hot path.

Канон:

- thread lookup должен быть дешёвым и предсказуемым;
- first slice должен отдаваться как отдельный read-model;
- interaction shaping не должна без нужды раздувать query count;
- public repeat reads могут использовать короткий read-cache;
- viewer-specific overlays не должны ломать базовую дешёвую форму.

## 3.3. Thread Continuation Contract

Continuation не должна пересобирать весь thread first slice.

Канон:

- cursor `(createdAt, id)` остаётся canonical;
- tail read оптимизируется как отдельный path;
- continuation не должна зависеть от shell-level full refresh;
- long-thread reading должен быть стабилен даже при большом числе posts.

## 3.4. Interaction Contract

Лайки, reputation, reports — это не core read-model, а overlays.

Канон:

- public read path не должен платить за viewer-specific overlays;
- expensive interaction aggregates не должны без нужды попадать в first slice;
- where possible interaction data должна идти как:
  - cheap count in base read-model
  - viewer-specific overlay only when it реально нужен

---

## 4. Canon Cold vs Warm Strategy

## 4.1. Cold Path

Cold path допустим дороже warm path, но не должен быть хаотичным.

Канон:

- cold query shape должен быть понятен и измерим;
- slowest query должна быть локализуема;
- cold path не должен плодить лишние identity hops.

## 4.2. Warm Path

Warm path — это то, что реально ощущает пользователь при повторном чтении живого форума.

Канон:

- warm first-slice должен быть максимально дешёвым;
- hot anonymous traffic может опираться на короткий read-cache;
- invalidation должна быть явной для:
  - new post
  - delete/hide/lock thread
  - delete/hide post
  - like/unlike
  - reputation mutation

---

## 5. Caching Rules

## 5.1. Allowed Caches

Допустимы:

- category slug -> id
- thread lookup metadata
- public thread first slice

Только если:

- TTL короткий;
- scope узкий;
- invalidation понятна;
- cache не подменяет реальную ACL truth.

## 5.2. Forbidden Caches

Нельзя без отдельного решения кэшировать:

- admin-visible thread variants;
- hidden/deleted forensic states;
- viewer-specific liked/reported/reputation overlays;
- anything that depends on auth-only truth without explicit user scoping.

---

## 6. Performance Budget Shape

Для `forum` дальше нужно мыслить не только route latency, а именно budget shape:

### Thread First Slice

- target warm path должен стремиться к суб-`500ms` server request total
- query count должен быть минимальным и объяснимым
- repeated anonymous reads должны быть почти бесплатными

### Thread Continuation

- continuation должна быть дешевле first slice
- no full thread recomposition

### Reply Create

- user должен видеть результат практически сразу;
- realtime не должен быть единственным способом увидеть собственный reply;
- write path должен автоматически инвалидировать stale read caches.

---

## 7. Implementation Order

Правильный порядок дальнейшей работы по `forum`:

1. stabilise thread first slice architecture
2. finish cold-path audit for `ForumPost` read
3. separate or cheapen interaction tail
4. measure thread continuation
5. measure reply create
6. optimise category list and broader social entry screens

Это важно, потому что сейчас самый ценный social bottleneck живёт именно внутри thread read path.

Update after current package:

- category list first-page public cache уже подключён;
- write-path invalidation теперь сбрасывает и category list, и thread read caches;
- поэтому следующий forum-heavy optimisation focus теперь уже не category entry, а cold thread/post shape и continuation costs.

---

## 8. Current State Against The Target

Что уже хорошо:

- measured baselines появились;
- thread lookup and category lookup partially cheapened;
- public first-slice cache уже даёт серьёзный warm win;
- public category-list first-page cache уже даёт почти бесплатный warm entry path;
- query count на warm forum thread read уже заметно сокращён.

Что ещё не дотянуто:

- cold path всё ещё дорогой;
- `ForumPost` slice остаётся главным slowest query;
- interaction tail ещё не доведён до окончательно зрелой формы;
- authenticated forum read path ещё не имеет полного cache-aware design.

---

## 9. Decision Rule For Future Forum Optimizations

Любая следующая оптимизация `forum` должна отвечать на вопросы:

1. Она уменьшает cold или warm cost измеримо?
2. Она не размывает ACL / moderation truth?
3. Она не делает invalidation неуправляемой?
4. Она улучшает `thread first slice`, `continuation` или `reply` как основные social hot paths?

Если ответ неясный, улучшение ещё не готово к внедрению.

---

## 10. Leadership Verdict

`Forum` уже нельзя оптимизировать только серией маленьких удачных патчей.

Патчи остаются полезными,
но теперь они должны встраиваться в более строгую performance-архитектуру:

- measured;
- cache-aware;
- invalidation-aware;
- split by read contracts;
- focused on cold vs warm truth separately.

Именно так дальше и должен развиваться forum, если цель — действительно зрелый и экономичный high-traffic social layer.
