# Performance Package C

**Date:** 2026-04-03  
**Status:** completed  
**Purpose:** перейти от perceived-speed fixes к более глубокому query-shape cleanup на дорогих server-side composed reads.

---

## 1. Package C Items

## C1. Chapter Screen Parallel Composition

### Current Problem

Chapter screen уже структурно чистый, но значимая часть server-side reads там всё ещё выполняется последовательно.

### Target

Распараллелить независимые reads и уменьшить cold render cost без смены UX.

### Applied

- chapter screen server composition переведён на более плотный `Promise.all`
- first render больше не тащит значимую часть независимых reads последовательно
- chapter screen initial post feed больше не резолвит ту же главу повторно по `slug/index`, если page уже получила `chapter.id`
- chapter page rights (`canPost/canToggle`) теперь приходят из самого page read-model, без дополнительного `getRole` запроса поверх уже загруженной главы
- chapter screen больше не делает отдельный второй read того же post slice только ради rail snippets / reading stats / read-state tail; эти данные теперь берутся из уже существующего initial post feed
- `/api/arcs/[slug]/chapters/[id]/posts` больше не строит лишнюю identity-цепочку `chapterId -> index -> chapter`; route теперь работает прямо от `chapterId + slug`
- `chapter` post creation снова собран в одну internal write-model truth, чтобы route tightening не размножил две почти одинаковые доменные реализации

---

## C2. Discovery Viewer Context Cost

### Current Problem

`getArcsDiscovery` и `buildArcViewerContext` всё ещё остаются дорогим viewer-aware compose path.

### Target

Сократить лишний internal mapping и пересмотреть, где можно уменьшить repeated context cost.

### Applied

- discovery уже не ремапит одни и те же arc rows повторно между секциями
- `continue reading` переиспользует уже загруженные discovery rows и не делает лишний fetch за теми же арками
- `buildArcViewerContext` для `catalog/search/discovery` теперь считает `following/participant` membership только по реально показанным `arcIds`
- discovery по-прежнему может использовать глобальное membership там, где это продуктово нужно для `continue reading`, но card-state больше не платит за весь глобальный набор

---

## C3. Forum Thread Read Model Tightening

### Current Problem

Forum thread tail/read path всё ещё делает отдельную thread identity resolution перед чтением post slice.

### Target

Собрать thread read model плотнее и сократить лишние hops на hot social path.

### Applied

- thread identity и initial/tail post slice читаются как более плотный read model
- hot social path делает меньше раздробленных шагов перед отдачей постов
- forum thread page server actions больше не дёргают session-layer дважды на один и тот же action
- reply create path больше не тянет лишний `thread.author` select, который не использовался
- `thread:new_post` теперь несёт rich post payload, поэтому realtime-клиенты могут аппендить новый reply сразу из SSE без обязательного дополнительного tail-fetch roundtrip

## Supporting Incidental Traffic Wins

- `usePresence` больше не делает mount-time `GET /api/presence/list` плюс сразу следом `POST /api/presence/ping`; online truth теперь берётся из одного `ping`-контракта
- `recordPresencePing` больше не ждёт три независимых Redis-операции последовательно; heartbeat path стал плотнее по сетевой лестнице
- удалён мёртвый `NotificationBell`, который держал устаревший параллельный notification entry path
- удалён неиспользуемый `/api/notifications/mark-read` после консолидации notification actions в каноничный `POST /api/notifications`
- удалён неиспользуемый `/api/notifications/unread-count` после окончательной консолидации unread truth на `count`
- удалён неиспользуемый `GET /api/forum/categories/[category]/threads/[slug]` identity endpoint
- удалён неиспользуемый `GET /api/presence/list` endpoint после перехода на ping-driven presence
- `chapter` client mutation/feed helpers переведены на каноничный `apiClient`, чтобы transport-layer не держал локальные ручные fetch/error исключения
- `authFlowClient`, `shopClient` и обычные JSON-path части `profileSettingsClient` тоже переведены на каноничный `apiClient`

---

## Package C Completion Note

### What Is Now Considered Closed

- hot `chapter` read/write paths больше не держат лишние chapter identity hops
- hot `forum` social path больше не платит за обязательный repair-fetch на каждый новый reply
- `arcs discovery` viewer context считает membership по displayed arcs, а не по всей пользовательской истории
- incidental traffic вокруг `presence` и notification aliases стал заметно дешевле и ровнее
- client transport слой перестал держать россыпь локальных JSON-fetch исключений

### Intentional Remaining Special Cases

- `lockClient` остаётся special-case transport из-за `keepalive` и специфики edit locks
- signed upload flows (`imageUploadClient`, часть avatar upload) остаются special-case, потому что там не обычный JSON CRUD, а init + external PUT
- SSE / stream routes (`events/stream`) и auth framework route (`auth/[...nextauth]`) не трогаются как обычный API transport

### Exit Criterion

`Package C` можно считать завершённым, потому что remaining exceptions уже в основном:
- либо product-special transport,
- либо framework-imposed boundaries,
- либо будущий отдельный этап глубокой DB/query observability, а не текущий query-shape cleanup.
