# 403Forbidden — Forum Scale Review v1

**Date:** 2026-04-05  
**Status:** active engineering review  
**Purpose:** оценить `forum` как главный будущий high-traffic слой проекта и зафиксировать, что уже хорошо, где есть реальные риски под рост, и какой следующий инженерный шаг будет самым правильным.

---

## 1. Strategic Verdict

`Forum` уже не выглядит сырым или хаотичным.

После рефакторинга и performance packages он находится в хорошем состоянии:

- read/write границы стали чище;
- realtime модель стала дешевле;
- continuation больше не ломает весь route;
- perceived speed reply flow уже лучше.

Но если смотреть как на место, где реально могут появляться сотни сообщений в день, `forum` ещё не fully hardened.

Сейчас это:

- **сильный и зрелый фундамент**
- но **ещё не окончательно запечатанная high-traffic social system**

---

## 2. What Is Already Good

## 2.1. Thread Flow Is Already Structurally Healthy

Сейчас `thread` path уже не собран как хаос из routes и случайных client fetches.

Есть понятная модель:

- SSR first slice
- local client continuation
- immediate local append for own reply
- SSE as sync/repair layer

Это правильная основа.

## 2.2. Realtime Is No Longer Naive

`thread:new_post` уже несёт rich post payload, а клиент не обязан всегда делать второй fetch.

Это серьёзное улучшение под живой social flow.

## 2.3. Transport And Domain Boundaries Are Better

`forum` уже имеет более правильную структуру:

- routes тоньше;
- services отвечают за правила;
- repos держат read-model;
- client interaction больше не размазан так грубо.

Для будущей нагрузки это критично.

## 2.4. Thread Lifecycle Is Now Real, Not Implicit

Форум уже имеет взрослые thread/post states:

- `open`
- `locked`
- `hidden`
- `deleted`

И это проведено через:

- schema
- service layer
- repo read-model
- admin controls
- user-facing placeholders

Это важный шаг, потому что раньше moderation и lifecycle были скорее идеями, чем реальной системой.

---

## 3. Real Remaining Risks

## 3.1. Cursor Contract Finally Needs Matching Index

Фактическая cursor-модель forum posts уже использует `(createdAt, id)`, но индекс должен быть с ней синхронизирован.

Поэтому в этой фазе уже применён правильный schema step:

- `ForumPost @@index([threadId, createdAt, id])`

Это не dramatic optimization, а базовая профессиональная дисциплина под стабильные tail reads и continuation.

## 3.2. Thread Ordering Canon Is Chosen

Канон уже определён:

- треды внутри категории живут по `последней активности`.

Это правильная продуктовая модель для живого social forum.

Следствие:

- category lists должны строиться по `lastActivityAt`;
- write paths должны обновлять это поле;
- индекс и cursor должны быть синхронизированы с этим порядком.

## 3.3. Moderation Model Is Better, But Not Yet Full-Spectrum

Базовый зрелый moderation groundwork уже есть:

- soft-delete thread/post
- hidden post
- hidden thread
- admin forensic visibility
- locked thread

Но для fully mature social system всё ещё не хватает:

- reports / escalation
- moderation inbox tooling
- richer audit trail
- future admin queues

## 3.4. Forum Still Lacks Measured Load Truth

Сейчас уже есть первый observability foundation, но forum ещё не имеет:

- measured read cost baselines на category/thread paths;
- formal query profile memo;
- synthetic нагрузочного понимания “что будет при 500 post/day”.

То есть next-level scale thinking только начинается.

---

## 4. What Should Be Done Next

## F1. Finish Activity-Ordered Category Lists

Продуктовое решение уже принято.

Теперь инженерная задача:

- окончательно закрепить thread ordering по `lastActivityAt`
- проверить pagination/cursor behavior под activity ordering
- исключить drift между write path и category read path

## F2. Add Forum Thread Read Measurements

После введения `Server-Timing` следующим шагом нужно померить:

- thread first slice
- thread tail fetch
- reply create

И зафиксировать baseline.

## F3. Add Moderation Operations Around Existing States

Базовая модель уже определена.

Следующий слой теперь не “придумать состояния”, а сделать взрослые операции вокруг них:

- report flow
- admin review flow
- moderation inbox / queue
- later audit trail enrichment

## F4. Prepare Category List For Real Activity Sorting

Следующий шаг теперь уже не “выбрать модель”, а довести её до полностью зрелого состояния:

- `lastActivityAt` write-path discipline
- category list measurement
- moderation-aware behavior around hidden/delete states

---

## 5. Leadership Verdict

`Forum` не требует переписывания.

Он требует:

- measured hardening;
- moderation model;
- и ещё одной волны scale discipline.

Именно туда дальше и нужно идти.
