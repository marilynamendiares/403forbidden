# Flow-Critical Performance Audit v1

**Date:** 2026-04-03  
**Status:** active working audit  
**Purpose:** пройти проект уже не как набор файлов, а как набор критических пользовательских потоков, чтобы следующий этап оптимизации был привязан к реальному UX проекта и реальным hot paths.

---

## 1. Audit Method

Каждый поток должен рассматриваться через четыре вопроса:

1. Что пользователь пытается сделать?
2. Какие запросы и state-переходы для этого реально обязательны?
3. Где есть лишняя стоимость, дублирование или тяжёлая форма реализации?
4. Что даст лучший выигрыш без ухудшения UX и архитектуры?

Этот документ будет расти по flow-модулям, а не по папкам.

---

## 2. Forum Thread Flow

## 2.1. UX Purpose

Thread page — это один из самых частых и чувствительных social flows проекта.

Пользователь здесь должен:

- быстро открыть тред;
- сразу увидеть последние сообщения;
- без трения читать длинную ленту;
- видеть новые сообщения почти мгновенно;
- отвечать без ощущения перезагрузки интерфейса;
- удалять свои сообщения без ломки локальной ленты.

Для проекта это важный path, потому что именно forum строит social entry layer и потенциально будет генерировать большой объём чтений и постинга.

## 2.2. Current Flow Shape

Текущий поток устроен так:

1. SSR-страница [`src/app/(shell)/forum/[category]/[slug]/page.tsx`](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/(shell)/forum/[category]/[slug]/page.tsx) читает первые `30` постов через [`getThreadPostsByCategoryAndSlug`](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/forum.ts).
2. Клиентский [`ThreadPostsClient`](/Users/inokentykonovalov/projects/personal/403forbidden/src/features/forum/ui/ThreadPostsClient.tsx) получает initial posts.
3. Хук [`useThreadRealtimePosts`](/Users/inokentykonovalov/projects/personal/403forbidden/src/features/forum/ui/useThreadRealtimePosts.ts) подписывается на tab-wide SSE через [`useEventStream`](/Users/inokentykonovalov/projects/personal/403forbidden/src/features/realtime/client/useEventStream.ts).
4. На событие `thread:new_post` клиент делает отдельный дозапрос в [`/api/forum/categories/[category]/threads/[slug]/posts`](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/api/forum/categories/[category]/threads/[slug]/posts/route.ts) с `afterCreatedAt/afterId`.
5. На событие `thread:post_deleted` сообщение удаляется локально из state без дополнительного fetch.
6. Отправка ответа идёт через server action `send()` на той же SSR-странице и вызывает [`createThreadPostForUser`](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/services/forum.ts).
7. Удаление поста и удаление треда также идут через server actions на странице.
8. Пагинация старых сообщений работает через `Load more posts`, который делает full navigation на тот же route с `?cursor=...`.

## 2.3. What Is Already Good

Сейчас в thread flow уже есть несколько правильных решений.

### A. SSR first page load is simple

Первый экран треда читается серверно одним понятным запросом.  
Это хорошо для:

- предсказуемого initial render;
- SEO/HTML completeness;
- отсутствия client-side spinner-этапа для основной ленты.

### B. Realtime connection is shared per tab

[`useEventStream`](/Users/inokentykonovalov/projects/personal/403forbidden/src/features/realtime/client/useEventStream.ts) держит один singleton `EventSource` на вкладку, а не плодит соединения на каждый компонент.  
Это правильно и экономно.

### C. New post fetch is incremental, not full reload

На `thread:new_post` не перетягивается весь тред, а только хвост после `(createdAt, id)`.  
Это уже нормальная модель для активной ленты.

### D. Delete path is cheap

Удаление сообщения не вызывает полную перезагрузку треда.  
При `thread:post_deleted` локальный список просто фильтруется по `postId`.

### E. Server/service boundaries are already much healthier

Thread page, routes и forum services уже не дублируют бизнес-правила так хаотично, как раньше.  
Это значит, что дальше можно оптимизировать поток, а не спасать архитектурный базис.

## 2.4. Current Problems

### P1. Thread identity is resolved twice on hot paths

[`getThreadPostsByCategoryAndSlug`](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/forum.ts) сначала ищет thread по `(category.slug, slug)`, а потом отдельным запросом читает posts по `threadId`.  
[`getThreadPostsAfterByCategoryAndSlug`](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/forum.ts) делает то же самое через отдельный `getThreadIdentityByCategoryAndSlug`.

Это не катастрофа, но для горячего thread flow это уже лишний hop.

### P1. Load more uses full route navigation

[`ForumThreadLoadMore`](/Users/inokentykonovalov/projects/personal/403forbidden/src/features/forum/ui/ForumThreadUi.tsx) ведёт на тот же route с `?cursor=...`, то есть старые сообщения догружаются не как continuation списка, а как новый page render.

Это плохо по двум причинам:

- reader UX ломается сильнее, чем нужно;
- тяжёлый shell/page pipeline участвует в задаче, которая по сути является обычным paginated append.

### P1. POST path has no optimistic or append-local feedback

После отправки ответа [`ReplyFormClient`](/Users/inokentykonovalov/projects/personal/403forbidden/src/components/ReplyFormClient.tsx) просто ресетит форму.  
Сам новый пост появляется только через SSE event + follow-up fetch.

С архитектурной точки зрения это допустимо.  
С UX и perceived performance — уже средне.

### P2. Realtime append still requires second HTTP roundtrip

Событие `thread:new_post` само по себе не содержит готового минимального DTO поста, а только сигнализирует “иди дозапросись”.  
Поэтому путь нового поста сейчас такой:

`create post -> publish event -> client receives event -> client fetches tail -> client merges`

Это безопасно и консистентно, но не идеально для очень активных тредов.

### P2. Cursor/index strategy is acceptable, but not yet fully hot-path oriented

У [`ForumPost`](/Users/inokentykonovalov/projects/personal/403forbidden/prisma/schema.prisma) сейчас индекс `@@index([threadId, createdAt])`.  
Для текущего объёма этого достаточно, но сам курсор в коде уже использует `(createdAt, id)`.

С инженерной точки зрения более честный индекс для потока будет:

- `(threadId, createdAt, id)` для стабильного курсора и after-tail polling.

### P2. Thread page still mixes read-model assembly and actions

[`src/app/(shell)/forum/[category]/[slug]/page.tsx`](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/(shell)/forum/[category]/[slug]/page.tsx) уже чище, чем раньше, но по-прежнему держит:

- initial read assembly;
- delete thread action;
- delete post action;
- send action;
- gate logic.

Это ещё не боль, но для truly hot social flow следующая ступень зрелости — выделить thread-page actions/view model чуть дальше.

## 2.5. Product Meaning Of These Problems

Важно не просто “оптимизировать ради оптимизации”.

Здесь смысл такой:

- forum — это вход в сообщество;
- thread page — место живого общения;
- живая лента не должна ощущаться тяжёлой;
- старые сообщения должны догружаться мягко;
- новый ответ должен появляться так, будто система живая, а не будто пользователь ждёт второй цикл подтверждения.

То есть улучшения здесь нужны не ради кода, а ради ощущения живого форума.

## 2.6. Recommended Next Package For Forum Thread Flow

### Package FT-1: Thread Read Model Tightening

Сделать один каноничный read helper для thread page и thread tail:

- единая thread identity resolution;
- единый post DTO shape;
- единая cursor strategy;
- подготовка под `(threadId, createdAt, id)` index.

### Package FT-2: Client-Side Incremental Pagination

Заменить full navigation `?cursor=` на client-side “load older posts”:

- отдельный client transport;
- append/prepend старых сообщений в текущий список;
- без повторного полного SSR page render.

Это, вероятно, даст лучший UX/complexity payoff на этом потоке.

### Package FT-3: Faster New-Post Perception

Рассмотреть одну из двух моделей:

1. оставить event + tail-fetch как canonical truth, но добавить optimistic append;
2. передавать в `thread:new_post` минимальный post payload, а tail-fetch использовать только как repair/fallback.

Для ранней зрелой версии проекта я бы сначала выбрал `optimistic append + canonical repair`, а не full event-payload model.

### Package FT-4: Forum Post Cursor Index Upgrade

Подготовить DB patch для:

- `ForumPost(threadId, createdAt, id)`

Это не срочный блокер, но правильная инвестиция под будущий трафик.

## 2.7. Current Verdict

Текущий thread flow уже не выглядит плохим или хаотичным.  
Он **архитектурно нормальный**, но **ещё не доведён до лучшей формы для живого форума**.

Если коротко:

- фундамент уже хороший;
- realtime уже не наивный;
- серверные границы уже здоровые;
- но reader flow и perceived performance ещё можно заметно улучшить.

---

## 3. Chapter Page + Chapter Posts Flow

## 3.1. UX Purpose

Chapter page — один из самых чувствительных экранов всего проекта.

Здесь пользователь:

- читает текущую главу;
- ориентируется по sticky rail и chapter nav;
- читает поток игровых постов;
- пишет новый пост;
- может редактировать intro или саму главу;
- должен чувствовать, что система живая, но не тяжёлая.

Это не просто страница чтения.  
Это одновременно `reader surface`, `writer surface` и `navigation surface`.

## 3.2. Current Flow Shape

Текущая модель потока такая:

1. SSR-страница [`src/app/(shell)/(protected)/arcs/[slug]/[index]/page.tsx`](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/(shell)/(protected)/arcs/[slug]/[index]/page.tsx) делает серверную композицию экрана:
   - `getChapterPageView`
   - `listChaptersForViewer`
   - `listChapterPagePostBodies`
   - `getNextPublishedChapterIndex`
   - `getWalletEurodollars`
2. Отдельно рендерится [`ChapterIntroClient`](/Users/inokentykonovalov/projects/personal/403forbidden/src/components/chapter/ChapterIntroClient.tsx).
3. Поток постов живёт в [`ChapterPostList`](/Users/inokentykonovalov/projects/personal/403forbidden/src/components/chapter/ChapterPostList.tsx) и грузится клиентски через [`/api/arcs/[slug]/[index]/posts`](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/api/arcs/[slug]/[index]/posts/route.ts).
4. Новый пост создаётся из [`ChapterComposer`](/Users/inokentykonovalov/projects/personal/403forbidden/src/components/chapter/ChapterComposer.tsx) через POST на тот же route.
5. SSE подписки работают так:
   - [`ChapterPostList`](/Users/inokentykonovalov/projects/personal/403forbidden/src/components/chapter/ChapterPostList.tsx) слушает `chapter:new_post`, `chapter:post_updated`, `chapter:post_deleted`
   - [`ChapterLiveClient`](/Users/inokentykonovalov/projects/personal/403forbidden/src/features/chapters/ui/ChapterLiveClient.tsx) слушает `chapter:updated`, `chapter:published`, `chapter:unpublished`, `chapter:deleted`, `chapter:opened`, `chapter:closed` и делает `router.refresh()`
6. Read-state отправляется клиентом через [`ReadStateTracker`](/Users/inokentykonovalov/projects/personal/403forbidden/src/components/arcs/ReadStateTracker.tsx).

## 3.3. What Is Already Good

### A. Reader/writer responsibilities are at least structurally separated

Сейчас chapter page уже не является одним гигантским файлом на все случаи.  
Intro, post feed, composer, rail nav и status actions уже разнесены лучше, чем раньше.

### B. Post feed is incremental and local-state driven

[`ChapterPostList`](/Users/inokentykonovalov/projects/personal/403forbidden/src/components/chapter/ChapterPostList.tsx) не заставляет страницу целиком обновляться при каждом новом посте.  
Это правильная модель для живого writing flow.

### C. Post create returns DTO immediately

[`POST /api/arcs/[slug]/[index]/posts`](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/api/arcs/[slug]/[index]/posts/route.ts) возвращает `post` DTO сразу после создания, а не только `ok`.

Это создаёт возможность для более умного optimistic/perceived-fast UX в следующем пакете.

### D. Read-state already has throttling discipline

[`ReadStateTracker`](/Users/inokentykonovalov/projects/personal/403forbidden/src/components/arcs/ReadStateTracker.tsx) уже не спамит state без контроля.  
Там есть минимальное время видимости и dedupe-окно. Это зрелое решение.

### E. Chapter business logic already mostly lives in services/repos

`open/close/publish/update/delete` уже не размазаны хаотично по routes и pages.  
Значит дальнейшая оптимизация может идти по потоку, а не по спасению сломанной архитектуры.

## 3.4. Current Problems

### P1. SSR chapter page composes too many separate reads

[`src/app/(shell)/(protected)/arcs/[slug]/[index]/page.tsx`](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/(shell)/(protected)/arcs/[slug]/[index]/page.tsx) сейчас строит страницу из нескольких отдельных server calls.

Это означает:

- дороже cold render;
- выше шанс рассинхрона между кусками view-model;
- сложнее дальше оптимизировать страницу как один hot path.

Экран уже просится на более цельный `getChapterScreenView(...)`.

### P1. Posts are loaded client-side after chapter SSR

Сама страница главы серверно знает интро и навигацию, но список игровых постов приходит уже вторым этапом через client fetch в [`ChapterPostList`](/Users/inokentykonovalov/projects/personal/403forbidden/src/components/chapter/ChapterPostList.tsx).

Для writer UX это допустимо.  
Для reader/perceived speed — уже спорно, потому что один из главных смыслов страницы появляется с задержкой.

### P1. Composer does not use returned post DTO

[`ChapterComposer`](/Users/inokentykonovalov/projects/personal/403forbidden/src/components/chapter/ChapterComposer.tsx) после успешного POST просто очищает редактор и ждёт SSE.

Но API уже возвращает `post`.  
То есть быстрый локальный append сейчас упущен.

### P1. ChapterPostList keeps first page entirely client-owned

Это означает, что:

- initial post list не входит в SSR perception;
- skeleton/spinner этап остаётся на одном из главных экранов продукта;
- история чтения зависит от второго цикла.

Для core gameplay surface это не идеальная форма.

### P2. Chapter page mixes reader and writer costs in one render path

В одном SSR cycle сейчас участвуют:

- reading intro
- chapter nav
- post-body extraction for rail snippets
- wallet fetch for reopen cost
- read-state anchor calculation

То есть страница уже почти “screen assembly service”, но ещё не оформлена как таковая.

### P2. Post feed initial load and realtime model are not unified

Сейчас посты живут так:

- first page через GET route;
- новые посты через SSE append;
- update/delete через SSE patch;
- create через POST + ожидание SSE.

Это рабочая схема, но не максимально цельная.  
Следующий зрелый шаг — сделать feed более честным single-source client model.

### P2. Repository layer still has overlapping chapter read models

[`getChapterBySlugIndex`](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/chapters.ts) и [`getChapterPageView`](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/chapters.ts) частично пересекаются по смыслу.  
Это не срочная проблема, но это уже сигнал, что reader models можно собрать лучше.

## 3.5. Product Meaning Of These Problems

Смысл здесь такой:

- chapter page — это не обычный “detail page”;
- это главный экран живого roleplay;
- он должен быть одновременно атмосферным, быстрым и непрерывным;
- если посты появляются с задержкой, а главный поток дочитывается вторым этапом, страдает ощущение живой главы.

Здесь оптимизация важна не ради benchmark, а ради ощущения, что пользователь находится внутри непрерывного потока письма.

## 3.6. Recommended Next Package For Chapter Flow

### Package CP-1: Chapter Screen View Consolidation

Сделать один каноничный server-side read model для chapter screen:

- chapter intro/meta
- arc summary
- chapter nav
- current chapter post summaries for rail
- next chapter index
- viewer permissions
- reopen economy flag

### Package CP-2: SSR First Post Slice

Перенести первый срез постов в SSR и передавать его в [`ChapterPostList`](/Users/inokentykonovalov/projects/personal/403forbidden/src/components/chapter/ChapterPostList.tsx) как `initialItems`.

Клиентский feed дальше уже продолжает:

- load more
- realtime append/update/delete
- optimistic create

Это вероятно лучший следующий UX/perf выигрыш на всём chapter flow.

### Package CP-3: Immediate Local Append On Create

После `createChapterPost` использовать уже возвращённый `post` DTO для мгновенного локального добавления в feed, а SSE оставлять как canonical sync/repair layer.

### Package CP-4: Unify Feed Read Model

Собрать один честный client feed contract:

- SSR initial slice
- paginated continuation
- realtime patching
- optimistic insertion

Это уберёт ощущение, что feed “собран из нескольких несовпадающих режимов”.

## 3.7. Current Verdict

Chapter flow уже архитектурно сильнее, чем был раньше.  
Но как core gameplay surface он всё ещё не доведён до лучшей формы.

Коротко:

- структура уже зрелая;
- realtime есть;
- read-state уже аккуратный;
- но initial post rendering и perceived writer speed ещё можно сделать заметно лучше.

---

## 4. Arcs Discovery Flow

## 4.1. UX Purpose

`Arcs` page — это не просто каталог.  
Это discovery surface, которая должна:

- показать, что архив живой;
- давать быстрый вход в arc reading;
- поддерживать ощущение атмосферного системного индекса;
- не убивать shell UX тяжёлым и дёрганым поиском.

Это reader/discovery path, а не writer path.  
Значит здесь особенно важны:

- сильный initial impression;
- плавные фильтры;
- быстрый поиск;
- дешёвые subsequent запросы.

## 4.2. Current Flow Shape

Текущий поток устроен так:

1. SSR-страница [`src/app/(shell)/(protected)/arcs/page.tsx`](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/(shell)/(protected)/arcs/page.tsx) делает два server reads параллельно:
   - [`getArcsDiscovery`](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/arcsDiscovery.ts)
   - [`getArcsCatalog`](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/arcsCatalog.ts)
2. Клиентский [`ArcsDiscoveryClient`](/Users/inokentykonovalov/projects/personal/403forbidden/src/components/arcs/ArcsDiscoveryClient.tsx) рендерит:
   - special sticky search overlay;
   - discovery sections;
   - catalog section;
   - create block.
3. Filter/search lifecycle живёт в [`useArcsCatalogSearch`](/Users/inokentykonovalov/projects/personal/403forbidden/src/hooks/useArcsCatalogSearch.ts).
4. Catalog работает через [`/api/arcs/catalog`](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/api/arcs/catalog/route.ts).
5. Search работает через [`/api/arcs/search`](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/api/arcs/search/route.ts).
6. Discovery sections (`topTrending`, `newJustStarted`, `recentlyUpdated`, `continueReading`, `underground`) собираются отдельным compose-read в [`getArcsDiscovery`](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/arcsDiscovery.ts).

## 4.3. What Is Already Good

### A. First impression is server-rendered and rich

Пользователь сразу получает:

- брендовый discovery экран;
- несколько curated sections;
- готовый каталог.

Это соответствует продуктовой задаче: `arcs` должны ощущаться как живая archive system, а не как пустой search form.

### B. Search and catalog are already separated conceptually

Catalog и full-text search разведены по отдельным путям.  
Это правильно, потому что это действительно два разных режима:

- `browse`
- `intentional search`

### C. Search backend is already more serious than naive LIKE

[`src/server/repos/arcsSearch.ts`](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/arcsSearch.ts) использует weighted full-text + similarity, а не примитивный поиск по одному полю.

Это уже хороший фундамент.

### D. Sticky search bar is now product-correct

Special sticky search overlay сейчас живёт по правильной layered-модели и не ломает shell mask/header truth.  
Это важно, потому что discovery page является ещё и важным shell-UX экраном.

## 4.4. Current Problems

### P1. Initial SSR is probably heavier than it needs to be

[`getArcsDiscovery`](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/repos/arcsDiscovery.ts) сейчас собирает несколько разных секций отдельными запросами, затем строит viewer context, membership context и continue-reading merge.

Это продуктово оправдано, но для hot discovery path уже дорого.

### P1. Client filter/search loop has no request cancellation or stale-result guard

[`useArcsCatalogSearch`](/Users/inokentykonovalov/projects/personal/403forbidden/src/hooks/useArcsCatalogSearch.ts) при смене query/state просто запускает новый fetch.

Сейчас там нет:

- `AbortController`;
- request id guard;
- explicit stale-result protection.

Для быстрых смен фильтра/поиска это может давать лишние запросы и late-response overwrite risk.

### P1. Search route has no pagination continuation

[`/api/arcs/search`](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/api/arcs/search/route.ts) возвращает `nextCursor: null`.  
То есть поиск сейчас effectively one-page.

Для первых версий это допустимо.  
Но как archive surface это уже ограничение.

### P2. Discovery and catalog may overlap too much in cost

На одной странице одновременно живут:

- несколько curated discovery blocks;
- full catalog;
- full search mode.

Это хорошо визуально, но уже требует осознанного бюджета по query cost и payload size.

### P2. Viewer context is recomputed often

И discovery, и catalog/search строят viewer-dependent context.  
Это правильно по продукту, но это значит, что `arcs` page очень чувствительна к стоимости membership/read-state/follow context.

### P2. Catalog/search state reset is still fairly blunt

При reset сейчас client-side состояние просто возвращается в `DEFAULT_CATALOG_STATE` и `initialCatalog`.

Это не плохо, но означает, что initial SSR payload становится каноничным fallback состоянием даже если данные уже устарели.

## 4.5. Product Meaning Of These Problems

Важно понимать: `arcs` page не обязана быть такой же дешёвой, как маленький API endpoint.

Она имеет право быть богаче, потому что:

- это showcase archive page;
- она продаёт саму идею `arcs`;
- она создаёт атмосферу и ориентирует пользователя.

Но она не должна быть тяжёлой бессмысленно.  
Оптимизация здесь должна искать баланс:

- богатый first paint
- дешёвый interactive filtering
- разумная стоимость server composition

## 4.6. Recommended Next Package For Discovery Flow

### Package AD-1: Client Search Transport Hardening

Усилить [`useArcsCatalogSearch`](/Users/inokentykonovalov/projects/personal/403forbidden/src/hooks/useArcsCatalogSearch.ts):

- `AbortController`
- request token / stale response guard
- более честная обработка быстрых input changes

Это, вероятно, первый и самый дешёвый выигрыш.

### Package AD-2: Discovery Composition Review

Проверить, какие блоки на initial page действительно нужны server-side always:

- возможно часть секций можно лениво догружать;
- возможно часть можно ограничить меньшими `take`;
- возможно `continueReading` должен быть единственным truly viewer-specific block, а не весь массив зависимостей.

### Package AD-3: Search Pagination

Если поиск должен жить как реальный archive tool, ему нужен настоящий continuation path, а не один page slice.

### Package AD-4: Viewer Context Cost Review

Отдельно проверить стоимость:

- follow context
- participation context
- read-state context

на `discovery/catalog/search` путях.

Это likely один из главных performance-review участков во второй фазе.

## 4.7. Current Verdict

Discovery flow уже выглядит как настоящий продуктовый экран, а не как случайная listing page.  
Это хорошо.

Но с performance perspective это один из самых сложных composed paths проекта:

- он богатый;
- он viewer-aware;
- он одновременно discovery, search и catalog.

Значит следующие улучшения должны быть не “упростить любой ценой”, а “удержать богатство, уменьшив лишнюю стоимость”.

---

## 5. Notifications Flow

## 5.1. UX Purpose

Notifications в этом проекте — это не просто secondary page.

Они нужны, чтобы:

- не пропускать новые chapter events;
- понимать, что в мире что-то произошло;
- держать social/game loop живым даже вне конкретной arc page;
- давать короткую и быструю обратную связь через bell/menu.

Это не самый тяжёлый поток по размеру запроса, но один из самых чувствительных по incidental traffic.

## 5.2. Current Flow Shape

Текущий контур устроен так:

1. Полная страница уведомлений [`src/app/(shell)/notifications/page.tsx`](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/(shell)/notifications/page.tsx) SSR-читает первые `50` записей через [`listNotificationsForUser`](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/services/notifications.ts).
2. Badge и bell используют:
   - [`useNotificationBadge`](/Users/inokentykonovalov/projects/personal/403forbidden/src/hooks/useNotificationBadge.ts)
   - [`useUnreadNotifications`](/Users/inokentykonovalov/projects/personal/403forbidden/src/hooks/useUnreadNotifications.ts)
   - [`/api/notifications/count`](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/api/notifications/count/route.ts)
3. User menu подгружает последние `5` уведомлений только при открытии через [`useNotificationsFeed`](/Users/inokentykonovalov/projects/personal/403forbidden/src/hooks/useNotificationsFeed.ts).
4. Local sync между menu/bell/page делается через browser event channel:
   - [`notificationUnreadEvents`](/Users/inokentykonovalov/projects/personal/403forbidden/src/lib/notificationUnreadEvents.ts)
5. Mark-one / mark-all / clear-all идут через:
   - [`/api/notifications`](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/api/notifications/route.ts)
   - [`applyNotificationOp`](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/services/notifications.ts)

## 5.3. What Is Already Good

### A. Count and feed are separated

Unread badge не грузит всю ленту.  
Это правильное решение.

### B. User menu does not constantly poll

Последние уведомления подгружаются только когда меню реально открыто.  
Это экономно и соответствует UX.

### C. Local sync path already exists

Состояние непрочитанного не пересчитывается тупо полной сетью после каждого клика.  
Есть локальный event channel и мягкий sync.

### D. Count fallback sync is throttled

`useUnreadNotifications` уже использует:

- `dedupingInterval`
- `refreshInterval` только на видимой вкладке

Это зрелее, чем наивный polling.

### E. Notification formatting is centralized

[`formatNotification` внутри services/notifications](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/services/notifications.ts) уже даёт UI-ready view model.

## 5.4. Current Problems

### P1. Two HTTP entry points still partially overlap

Есть:

- [`/api/notifications/count`](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/api/notifications/count/route.ts)
- [`/api/notifications?unread=1`](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/api/notifications/route.ts)

Хотя клиент уже в основном сидит на `count`, старый overlap сохраняется и размазывает truth.

### P1. Page feed is SSR-only for first slice

Полная notifications page сейчас просто рендерит первые `50` записей серверно и не даёт continuation UX.  
Как текущая версия это нормально, но как живая inbox surface это ещё не завершённый flow.

### P1. Bell/menu state still depends on multiple soft-sync layers

Badge truth сейчас складывается из:

- initial SWR count;
- local optimistic unread events;
- SSE event interpretation;
- visibility-based sync.

Это не плохо, но уже достаточно сложный контур, и его нужно держать очень дисциплинированным, иначе легко получить рассинхрон.

### P2. Notification feed has no explicit realtime-first model

Сейчас unread badge реагирует быстро, но сам список уведомлений не живёт как realtime feed.  
Он скорее “лениво актуализируется”.

Для текущей стадии это допустимо, потому что notifications не главный live surface.  
Но это важно зафиксировать как осознанный компромисс.

### P2. Full page and menu use different feed shapes and behaviors

Это естественно по UX, но значит, что notifications уже являются двумя режимами:

- compact recent feed
- full inbox page

Следующая зрелая версия должна держать их как два режима одной системы, а не как два почти независимых представления.

## 5.5. Product Meaning Of These Problems

Notifications не обязаны быть таким же мгновенным и тяжёлым realtime surface, как forum thread или chapter page.

Но они должны:

- быть дешёвыми;
- не рассинхронизировать badge;
- не плодить лишний traffic в фоне;
- давать ощущение живой системы.

Именно поэтому главный критерий здесь — не raw speed, а дисциплина incidental traffic и consistency.

## 5.6. Recommended Next Package For Notifications Flow

### Package NF-1: Unread Truth Consolidation

Окончательно закрепить один каноничный unread path:

- один count endpoint
- один client hook
- один local event contract

и убрать остаточный overlap `?unread=1`.

### Package NF-2: Notifications Inbox Continuation

Если notifications page должна жить как реальный inbox, ей нужен continuation flow:

- load more / cursor
- возможно client continuation поверх SSR first slice

### Package NF-3: Feed/Badge Contract Review

Отдельно проверить, действительно ли все SSE/local events для badge нужны, или часть можно свести к более простому unread contract.

## 5.7. Current Verdict

Notifications flow уже не выглядит хаотичным.  
Он скорее уже в стадии “сделано разумно, но можно сделать ещё более дисциплинированно”.

Это хороший знак:

- здесь не нужно спасать архитектуру;
- здесь нужно добивать consistency и экономить фоновые запросы.

---

## 6. Presence + Shell Incidental Traffic

## 6.1. UX Purpose

Этот поток не выглядит как “страница”, но он очень важен.

Сюда входят:

- presence;
- shell persistence;
- shell history memory;
- incidental background sync вокруг живого интерфейса.

Пользователь не должен думать об этом вообще.  
Если этот слой сделан плохо, проект становится тяжёлым, шумным и дорогим в фоне.

## 6.2. Current Flow Shape

Сейчас контур выглядит так:

1. [`usePresence`](/Users/inokentykonovalov/projects/personal/403forbidden/src/hooks/usePresence.ts) держит цикл:
   - `POST /api/presence/ping`
   - `GET /api/presence/list`
   - повтор каждые `5` минут
   - refresh при возвращении вкладки в `visible`
2. Server-side presence живёт в:
   - [`recordPresencePing`](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/services/presence.ts)
   - [`listOnlineUserIds`](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/services/presence.ts)
3. Presence пишет:
   - Redis ephemeral presence
   - throttled `lastSeenAt` в БД
4. Shell persistence живёт в:
   - [`ShellUIContext`](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/shell/ShellUIContext.tsx)
   - [`shellHistoryState`](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/shell/shellHistoryState.ts)
   - [`browserStorage`](/Users/inokentykonovalov/projects/personal/403forbidden/src/lib/browserStorage.ts)

## 6.3. What Is Already Good

### A. Presence is not chat-level aggressive

Ping раз в `5` минут — это спокойный и недорогой режим.  
Для проекта такого типа это разумно.

### B. Visibility-aware sync already exists

Presence не долбит сеть на невидимой вкладке.  
Это правильный baseline.

### C. Last seen writes are throttled

`lastSeenAt` не пишется в БД на каждый ping, а только по throttle окну.  
Это очень правильное решение.

### D. Shell state persistence is local and cheap

Sidebar open state и shell history живут в storage, а не в лишних server roundtrips.  
Это соответствует продуктовой природе shell.

## 6.4. Current Problems

### P1. Presence still does ping + list as two sequential network steps

[`usePresence`](/Users/inokentykonovalov/projects/personal/403forbidden/src/hooks/usePresence.ts) на visible refresh делает:

1. `ping`
2. `list`

Это корректно, но не минимально.  
Для такого incidental path уже можно думать о combined response или smarter invalidation.

### P1. Presence list is global, not scoped

Сейчас список online users возвращается общим массивом `onlineUserIds`.  
Это удобно, но при росте числа пользователей может стать неидеальным для экранов, которым нужна только частичная подвыборка.

### P2. Shell incidental state is disciplined, but still fragmented by feature

Sidebar state, shell history, notification badge, presence, read-state, lock heartbeat — всё это уже стало чище, но пока не описано как единая политика incidental traffic.

То есть архитектурно уже лучше, но operational canon ещё можно усилить.

## 6.5. Product Meaning Of These Problems

Этот слой не должен быть “умным ради красоты”.  
Его задача:

- быть дешёвым;
- быть незаметным;
- не накапливать случайный traffic;
- не мешать основной работе forum/arcs.

Именно здесь проект можно сделать либо профессиональным, либо скрыто дорогим.

## 6.6. Recommended Next Package For Incidental Traffic

### Package PS-1: Presence Contract Review

Проверить, нужен ли split:

- `ping`
- `list`

или лучше combined lightweight presence refresh contract.

### Package PS-2: Scope Presence Reads

Если `users` или другие экраны реально используют только subset пользователей, перейти от global online list к scoped reads.

### Package PS-3: Incidental Traffic Canon

Собрать отдельный технический canon:

- presence
- unread count
- lock heartbeat
- read-state
- shell persistence

и зафиксировать для каждого:

- частоту
- допустимую задержку
- источник истины
- fallback policy

## 6.7. Current Verdict

Этот слой уже не выглядит плохим.  
Скорее наоборот: он уже достаточно зрелый, чтобы следующий шаг был именно operational optimization, а не cleanup.

---

## 7. Character Gate Flow

## 7.1. UX Purpose

Character gate — это ключевой product transition:

`guest/restricted -> approved player`

С UX-точки зрения это очень важный поток, хотя по raw traffic он далеко не самый горячий.

Он должен:

- быть понятным;
- не казаться сломанным или бюрократичным;
- уверенно переводить пользователя из наблюдателя в участника;
- давать администрации предсказуемый review flow.

## 7.2. Current Flow Shape

Сейчас поток состоит из двух сторон.

### User side

- список анкет:
  [src/app/(full)/characters/page.tsx](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/(full)/characters/page.tsx)
- редактор анкеты:
  [src/app/(full)/characters/[id]/page.tsx](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/(full)/characters/[id]/page.tsx)
- data hooks:
  [useCharacterApplications](/Users/inokentykonovalov/projects/personal/403forbidden/src/hooks/useCharacterApplications.ts)
  [useCharacterApplicationItem](/Users/inokentykonovalov/projects/personal/403forbidden/src/hooks/useCharacterApplicationItem.ts)

### Admin side

- admin list / review:
  [src/app/(shell)/admin/characters/[id]/page.tsx](/Users/inokentykonovalov/projects/personal/403forbidden/src/app/(shell)/admin/characters/[id]/page.tsx)
- service-layer:
  [src/server/services/characterApplications.ts](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/services/characterApplications.ts)

## 7.3. What Is Already Good

### A. Flow meaning is already explicit in the product

Character application не выглядит как случайная форма.  
Она реально встроена в роль-модель проекта.

### B. User and admin sides already share canonical services

Review logic, submit logic, status transitions уже собраны в server service layer.  
Это правильно.

### C. Status discipline is decent

Есть понятные статусы:

- `DRAFT`
- `SUBMITTED`
- `UNDER_REVIEW`
- `NEEDS_CHANGES`
- `APPROVED`

Это good enough для раннего зрелого продукта.

### D. Admin notifications already exist

Submit flow уведомляет админов, а review flow уведомляет пользователя.  
Это усиливает системную целостность.

## 7.4. Current Problems

### P1. Character flow is still entirely client-driven

И список, и detail pages у пользователя/admin сделаны как client pages с SWR-fetch after mount.

Для такой редкой формы это не критично.  
Но product-wise это всё ещё gate flow, и он мог бы быть чуть более уверенным и SSR-friendly.

### P1. Create/save/submit is split into multiple roundtrips from the user page

User detail page:

- отдельно update
- отдельно submit
- перед submit даже есть best-effort silent update

Это рабочая схема, но она ещё несёт следы “form flow assembled on client”.

### P2. Admin review fetch causes status side-effect on read

[`getCharacterApplicationForAdmin`](/Users/inokentykonovalov/projects/personal/403forbidden/src/server/services/characterApplications.ts) переводит `SUBMITTED -> UNDER_REVIEW` во время чтения.

Это может быть осознанным продуктовым решением, но как архитектурный паттерн это уже спорно:

- read path меняет state;
- side effect прячется в detail fetch.

### P2. List flow has no explicit pagination

Сейчас для ранней стадии это ок, но при росте количества анкет список тоже потребует continuation.

## 7.5. Product Meaning Of These Problems

Character gate не нужно оптимизировать как forum thread.

Здесь важнее:

- ясность;
- надёжность;
- предсказуемость статусов;
- отсутствие случайной путаницы для restricted users и admins.

То есть следующая зрелость здесь — не “сделать молниеносно”, а “сделать железно и прозрачно”.

## 7.6. Recommended Next Package For Character Gate

### Package CG-1: Gate Flow Clarification

Отдельно зафиксировать:

- когда restricted видит `required=1`
- когда и как user понимает, что доступ ещё не открыт
- когда admin review считается “взятым в работу”

### Package CG-2: Admin Review Side-Effect Separation

Рассмотреть выделение явного action `claim/review-start`, если текущий implicit transition на read окажется слишком неочевидным.

### Package CG-3: SSR/Client Balance Review

Решить, должен ли character gate оставаться client-first form flow, или часть этих экранов уже стоит сделать увереннее через server-first data.

## 7.7. Current Verdict

Character gate сейчас не выглядит слабым местом проекта.  
Он скорее уже работает как разумная product gate system.

Но это ещё не максимально зрелая версия:

- read side effects надо осознанно оценить;
- UX объяснения restricted -> player перехода можно усилить;
- transport можно со временем сделать ещё ровнее.

---

## 8. Next Step

После завершения этого аудита правильный следующий шаг:

1. составить `PERFORMANCE_PACKAGE_A`
2. выбрать 3-5 изменений с наибольшим payoff
3. внедрять их уже не по папкам, а по реальному выигрышу для UX и нагрузки
