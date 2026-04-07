# Performance Package A

**Date:** 2026-04-03  
**Status:** active implementation package  
**Purpose:** выбрать первые изменения с наибольшим payoff после `FLOW_CRITICAL_PERFORMANCE_AUDIT_V1`, чтобы улучшать не весь проект сразу, а самые важные UX/hot paths.

---

## 1. Selection Rule

В пакет вошли только изменения, которые одновременно дают:

- высокий выигрыш по UX;
- заметное снижение лишней стоимости или incidental traffic;
- низкий или средний риск регрессии;
- хорошую совместимость с уже выпрямленной архитектурой.

---

## 2. Package A Items

## A1. Forum Thread Incremental Continuation

### Current Problem

Thread page до сих пор догружает следующую порцию постов через full navigation на тот же route с `?cursor=...`.

### Why This Matters

Это избыточно для обычного продолжения живой ленты:

- гоняется весь page pipeline;
- shell/history/navigation участвуют в задаче, которая должна быть локальной;
- UX у треда ощущается тяжелее, чем нужно.

### Target

Сделать client-side continuation внутри [`ThreadPostsClient`](/Users/inokentykonovalov/projects/personal/403forbidden/src/features/forum/ui/ThreadPostsClient.tsx) через existing posts API.

### Payoff

Высокий UX payoff, низкий риск.

---

## A2. Arcs Search Transport Hardening

### Current Problem

[`useArcsCatalogSearch`](/Users/inokentykonovalov/projects/personal/403forbidden/src/hooks/useArcsCatalogSearch.ts) не защищён от stale responses и не использует `AbortController`.

### Why This Matters

Discovery page — тяжёлый viewer-aware экран.  
Быстрые изменения query/filter могут создавать лишний трафик и гонки между старыми и новыми ответами.

### Target

Добавить:

- request cancellation;
- request token / latest-request guard;
- более честную загрузочную дисциплину.

### Payoff

Высокий технический payoff, низкий риск.

---

## A3. Chapter Feed SSR First Slice

### Current Problem

Chapter page server-side собирает почти весь экран, но сами посты грузятся уже вторым client-side этапом.

### Why This Matters

Chapter page — core gameplay screen.  
Главный post feed не должен ощущаться как вторичная загрузка.

### Target

Передавать первый slice постов в [`ChapterPostList`](/Users/inokentykonovalov/projects/personal/403forbidden/src/components/chapter/ChapterPostList.tsx) как `initialItems` и продолжать дальше client-side realtime/pagination поверх него.

### Payoff

Очень высокий UX payoff, но чуть выше риск и объём, чем у `A1/A2`.

---

## A4. Notification Unread Truth Consolidation

### Current Problem

Unread truth уже в целом хорошая, но всё ещё держится на нескольких мягких sync-механиках и историческом overlap route contracts.

### Target

Окончательно закрепить:

- один canonical count path;
- один canonical unread client contract;
- убрать остаточные overlap entry points.

### Payoff

Средний UX payoff, хороший incidental-traffic payoff.

---

## A5. Presence Contract Review

### Current Problem

Presence по visible refresh делает два последовательных шага:

- `ping`
- `list`

### Target

Оценить и при необходимости объединить или дисциплинировать этот контракт.

### Payoff

Средний payoff, низкий user-visible эффект, но полезно для фоновой нагрузки.

---

## 3. Execution Order

Правильный порядок внедрения:

1. `A1 Forum Thread Incremental Continuation`
2. `A2 Arcs Search Transport Hardening`
3. `A3 Chapter Feed SSR First Slice`
4. `A4 Notification Unread Truth Consolidation`
5. `A5 Presence Contract Review`

---

## 4. Start Point

Стартуем с `A1`, потому что это:

- очень видимый UX выигрыш;
- low-risk;
- прямое улучшение одного из самых частых social flows проекта.

