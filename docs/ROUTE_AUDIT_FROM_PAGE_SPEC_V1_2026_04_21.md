# 403Forbidden — Route Audit From Page Specification v1

**Date:** 2026-04-21  
**Status:** active route audit  
**Inputs:**

- [`PAGE_TO_PAGE_PRODUCT_SPEC_V1_2026_04_17.md`](/Users/inokentykonovalov/projects/personal/403forbidden/docs/PAGE_TO_PAGE_PRODUCT_SPEC_V1_2026_04_17.md)
- [`DEVELOPMENT_STRATEGY_FROM_PAGE_SPEC_V1_2026_04_21.md`](/Users/inokentykonovalov/projects/personal/403forbidden/docs/DEVELOPMENT_STRATEGY_FROM_PAGE_SPEC_V1_2026_04_21.md)
- current `src/app/**/page.tsx`

**Purpose:** сверить реальные страницы проекта с новой продуктовой спецификацией и определить первый порядок разработки.

---

## 1. Audit Legend

- **MATCH** — страница в целом соответствует новой продуктовой роли.
- **PARTIAL** — страница рабочая, но не дотягивает до spec.
- **PLACEHOLDER** — страница существует в основном как заглушка.
- **CONFLICT** — текущее поведение противоречит новой продуктовой роли.
- **ALIAS** — маршрут является редиректом/legacy alias.

---

## 2. Executive Verdict

Проект уже имеет сильную route-основу, но продуктовая карта пока опережает реализацию.

Главные расхождения:

1. `/profile` сейчас редиректит в `/profile/settings`, хотя по spec должен стать главным current-user dashboard.
2. `/world` entry уже близок к нужной роли, но большинство world-разделов остаются placeholders.
3. `/pager` пока placeholder, а `/notifications` всё ещё отдельный route, хотя стратегия ведёт к unified pager/inbox.
4. `/world/shop` уже содержит реальный shop, но по spec shop должен переехать в shell-level `/shop`.
5. `/arcs` уже сильнее многих зон, но не хватает очевидных locked/preview states, календаря/локаций и character identity polish.
6. Forum уже имеет здоровую основу, но ещё не modern social-thread system: нет quotes/partial quotes/mentions UX/thread subscriptions.
7. Admin работает прагматично, но dashboard пока слишком узкий и centred around wallet tool.

---

## 3. Public Entry And Auth

| Route | Status | Current State | Spec Gap | Priority |
|---|---:|---|---|---:|
| `/` | PARTIAL | Рабочая landing страница с guest/user state. | Слишком прямое "collaborative roleplay forum", мало gateway/system feeling, нет NSFW disclaimer, нет subtle activity signal, ведёт guest к `/arcs` слишком явно. | P1 |
| `/signup` | PARTIAL | Простая регистрация username/email/password, ведёт на verify-email. | Нет realtime username check, нет пояснения username-as-handle, визуально generic. | P1 |
| `/login` | PARTIAL | Рабочий login, success banners, forgot password. | Визуально generic, callback default ведёт на `/`, не на intended shell/profile strategy. | P2 |
| `/verify-email` | PARTIAL | Существует, не углублялся в этом pass. | Нужно проверить, насколько strict mandatory verification оформлена как access step. | P2 |
| `/forgot-password` | PARTIAL | Существует, не углублялся в этом pass. | Низкий продуктовый риск. | P3 |
| `/reset-password` | PARTIAL | Существует, не углублялся в этом pass. | Низкий продуктовый риск. | P3 |

---

## 4. World

| Route | Status | Current State | Spec Gap | Priority |
|---|---:|---|---|---:|
| `/world` | PARTIAL | Хорошая directory board основа, hero + links + systems. | Нужна stronger entry version, меньше "under construction" feeling, map linked как disabled despite route exists. | P1 |
| `/world/lore` | PLACEHOLDER | Generic archive placeholder. | Нужен реальный lore entry content. | P2 |
| `/world/map` | PLACEHOLDER | Generic archive placeholder. | Нужен interactive/reference map или честная map-specific placeholder. | P2 |
| `/world/locations` | PLACEHOLDER | Generic archive placeholder. | Нужна canonical locations structure, позже source for arc location selection. | P1 |
| `/world/factions` | PLACEHOLDER | Generic archive placeholder. | Нужна factions reference, влияет на character application. | P1 |
| `/world/timeline` | PLACEHOLDER | Generic archive placeholder. | Нужна history-before-current-time structure. | P2 |
| `/world/systems` | PARTIAL | Есть rules/mechanics/FAQ directory. | Нужна более атмосферная but readable systems documentation. | P2 |
| `/world/systems/rules` | PLACEHOLDER | Specific placeholder. | Нужны реальные boundaries/rules. | P1 |
| `/world/systems/mechanics` | PLACEHOLDER | Specific placeholder. | Нужны economy/reputation/arcs/shop mechanics explanations. | P1 |
| `/world/systems/faq` | PLACEHOLDER | Specific placeholder. | Нужен onboarding/access/approval FAQ. | P2 |
| `/world/shop` | CONFLICT | Реальный shop, требует sign-in. | По spec shop не должен быть частью world; guest должен видеть storefront. Нужен `/shop` decision. | P1 |

---

## 5. Character Gate

| Route | Status | Current State | Spec Gap | Priority |
|---|---:|---|---|---:|
| `/characters` | PARTIAL | Центр заявок с create/list/status/mod note. | Уже близко. Нужны examples/help, stronger dossier tone, one-active-character policy copy, better empty state. | P1 |
| `/characters/[id]` | PARTIAL | Рабочая анкета с save/submit/status lock, local draft recovery and visual reference upload. | Нет faction dropdown/NSFW preferences, мало world guidance. | P1 |
| `/admin/characters` | PARTIAL | Рабочая queue split in-review/other. | Хорошая база. Нужен dashboard integration. | P2 |
| `/admin/characters/[id]` | PARTIAL | Рабочий review с note, approve/needs changes and readonly visual reference. | Нет reject action, version diff, span-level comments. | P2 |

---

## 6. Profile, Users, Inventory

| Route | Status | Current State | Spec Gap | Priority |
|---|---:|---|---|---:|
| `/profile` | ALIAS | Redirects to `/me`. | OK as compatibility route. | P3 |
| `/profile/settings` | PARTIAL | Рабочее редактирование profile/avatar/display/bio. | Должно стать вторым слоем внутри `/profile`, не главным профилем. | P1 |
| `/settings/profile` | ALIAS | Redirects to `/profile/settings`. | OK as legacy alias. | P3 |
| `/me` | PARTIAL | Canonical current-user profile/dashboard with character gate state, shell right rail character card or create-character prompt, access state, locked sections and personal arc chronology. | Needs cosmetics/inventory modules and final visual pass. | P0 |
| `/u/[username]` | PARTIAL | Public profile route; own username redirects to `/me`; shell right rail shows approved character card or no-character banner; main content includes public arc chronology. | Needs privacy/locked sections later. | P1 |
| `/u/[username]/inventory` | PARTIAL | Owned items list grouped by category. | Empty state points to `/world/shop`; should point to future `/shop`. No privacy/access model. | P1 |
| `/users` | PARTIAL | Users directory table with avatar, client-side search, presence sorting, player/restricted state, approved character name and inline quick preview. | Нужен pager action later. | P2 |

---

## 7. Forum

| Route | Status | Current State | Spec Gap | Priority |
|---|---:|---|---|---:|
| `/forum` | PARTIAL | Broadcast tiles + category buttons with disabled locked category previews, access labels and latest visible thread activity for unlocked categories. | Нужен stronger hot-thread/social board pass later. | P1 |
| `/forum/news` | PARTIAL | Broadcast index cards. | Хорошая basic direction, but cards still generic and no maintenance channel. | P2 |
| `/forum/news/public` | PARTIAL | Exists as category-like page. | Нужно проверить channel/broadcast distinction and admin authoring. | P2 |
| `/forum/news/players` | PARTIAL | Exists as category-like page. | Нужно player-only visibility and broadcast presentation. | P2 |
| `/forum/news/devlog` | PARTIAL | Exists as category-like page. | Needs broadcast polish. | P3 |
| `/forum/[category]` | PARTIAL | Working thread list, activity, create form, create hint, locked category screen and stronger locked thread rows. | Still classic list; needs board/social topic surface, subscriptions later. | P1 |
| `/forum/[category]/[slug]` | PARTIAL | Strong base: post list, realtime client, likes/rep/reports/hide/delete/lock. | Missing quote/partial quote/reply-to/mentions UX and thread subscription. | P1 |

---

## 8. Arcs

| Route | Status | Current State | Spec Gap | Priority |
|---|---:|---|---|---:|
| `/arcs` | PARTIAL | Strong discovery/catalog client, create guarded by player status. | Need restricted/guest preview/locked messaging, link to co-writer forum thread, date/location/rating in create flow. | P1 |
| `/arcs/[slug]` | PARTIAL | Strong arc page: intro, chapters, metadata editor, collaborators, follow. | Need clearer product metadata: date/location/rating, role copy, close arc/economy later, collaborator invite UX polish. | P1 |
| `/arcs/[slug]/[index]` | PARTIAL | Strong chapter page: intro, posts, status actions, reading stats, reopen cost, live client. Chapter post header now uses character identity with expandable account attribution. Chapter composer now has visible local draft recovery. | Need reward formula clarity, location/date display, future character-specific avatars/NPC masks. | P0 |

---

## 9. Pager And Notifications

| Route | Status | Current State | Spec Gap | Priority |
|---|---:|---|---|---:|
| `/pager` | PLACEHOLDER | Under construction page. | Needs unified inbox foundation. | P1 |
| `/notifications` | CONFLICT | Separate notifications list with mark/clear. | Spec wants notifications folded into pager over time; current route can remain but should be transitional. | P2 |

---

## 10. Admin And Operations

| Route | Status | Current State | Spec Gap | Priority |
|---|---:|---|---|---:|
| `/admin` | PARTIAL | Currently manual wallet tool. | Spec wants task dashboard + links/queues. Wallet should not dominate root. | P1 |
| `/admin/reports` | PARTIAL | Useful reports queue with hide/delete/dismiss. | Matches simple open/closed direction, but may need broader reports later. | P2 |
| `/admin/wallet` | PARTIAL | Ledger feed/filter. | Manual adjust exists on `/admin`, but page itself lacks correction form; receipts to pager not present. | P2 |
| `/admin/shop` | PARTIAL | Purchase/acquisition feed/filter. | Lacks create/edit item and manual grant item. | P1 |

---

## 11. Shell And Global Navigation

| Surface | Status | Current State | Spec Gap | Priority |
|---|---:|---|---|---:|
| Shell layout | MATCH / PARTIAL | Strong shell root/topbar/frame architecture. | Need access-level/restricted signal and maybe pager unread in header. | P1 |
| Terminal layer | PARTIAL | Strong atmosphere layer in existing app structure. | Functional terminal/query layer is future; no immediate action. | P3 |
| Shell topbar | PARTIAL | Shows eurodollars and nav. | Needs character approval/access state signal, presence/unread strategy. | P1 |
| `/archive` | ALIAS | Redirects to `/world`. | Acceptable until archive meaning is decided. | P3 |

---

## 12. P0 / P1 Development Backlog

## P0 — Do First

### P0.1. Make `/me` The Canonical Current-User Dashboard

Status:

- implemented initial dashboard on `/me`;
- `/profile` redirects to `/me`;
- `/u/[own-username]` redirects to `/me`.

Done:

- `/profile` shows own profile dashboard;
- restricted banner;
- character status;
- locked player-only sections;
- links to settings and character application;
- approved character card when available.

Remaining:

- richer approved character presentation;
- active arcs/profile chronology;
- final design pass;
- connect future shop route.

Why:

- this is the main place to explain `registered -> player`.

### P0.2. Character Identity Audit In Chapter Posts

Status:

- initial implementation complete.

Done:

- chapter post DTO now includes approved character identity derived from the post author;
- collapsed header displays character name;
- expanded header shows `by @username` and links to `/u/[username]`;
- approved character identity is now resolved through the canonical character identity service;
- forum identity remains untouched.

Remaining:

- character image upload in character application;
- richer expanded character card;
- future NPC/per-post identity override.

Why:

- identity distinction is core product truth.

### P0.3. Draft Recovery UX For Character And Chapter Writing

Current problem:

- draft/autosave exists in parts, but user trust state is not consistently surfaced.

Required:

- visible saved/local draft state; implemented first for chapter post composer and character application;
- failure copy that says text remains local;
- recovery state after reload where applicable;
- discard local draft action for user control.

Why:

- losing text is the most serious trust failure.

## P1 — Next

### P1.1. Reusable Locked Surface Component

Used by:

- profile;
- arcs;
- shop;
- forum;
- pager.

Must support:

- required access;
- short explanation;
- next action;
- optional preview.

### P1.2. Shop Route Decision And Shell `/shop`

Current problem:

- real shop lives at `/world/shop`.

Required:

- introduce `/shop` inside shell or decide migration plan;
- update inventory empty links;
- let guest/restricted see storefront/locked buying state.

### P1.3. Forum Activity Tiles And Locked Previews

Required:

- category cards show latest visible thread activity where cheap;
- locked category/thread previews, without leaking activity from inaccessible areas;
- better create-thread disabled state.

### P1.4. Arcs Restricted Preview And Create Flow Fields

Required:

- make restricted/guest states explicit;
- improve create arc fields toward title/description/date/location/visibility/rating;
- link to co-writer forum area.

### P1.5. Pager Foundation Design

Required:

- data model design before UI build;
- message types;
- unread model;
- delivery/receipt rules;
- migration path from `/notifications`.

### P1.6. Admin Root Dashboard

Required:

- `/admin` shows queues/links;
- wallet tool moves into a section or remains as a card, not sole root meaning.

---

## 13. Things Not To Build Yet

Do not start now:

- full DM messenger;
- global search;
- neuralink artifact search unlock;
- hidden lore unlock system;
- multi-character accounts;
- full inventory equipment skeleton;
- full reward formula and automatic arc payouts;
- player-generated timeline;
- span-level application comments.

These remain good ideas, but the route audit shows the foundation should come first.
