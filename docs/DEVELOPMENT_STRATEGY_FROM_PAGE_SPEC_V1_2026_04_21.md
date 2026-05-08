# 403Forbidden — Development Strategy From Page Specification v1

**Date:** 2026-04-21  
**Status:** active development strategy draft  
**Purpose:** превратить page-to-page product specification в инженерную стратегию: что строить первым, что отложить, какие зависимости учитывать и как развивать проект без хаоса.

---

## 1. Lead Developer Verdict

Проект уже имеет сильную продуктовую идею, но теперь его главный риск — не отсутствие фич, а неправильный порядок их внедрения.

Если строить всё сразу, система расползётся:

- forum захочет стать social network;
- arcs потребуют economy/rewards;
- pager захочет стать messenger;
- profile/shop захотят cosmetics and inventory;
- world захочет hidden lore unlocks;
- shell захочет artifact-powered search.

Все эти идеи сильные, но они не равнозначны по срочности.

Правильная стратегия:

1. укрепить existing core;
2. закрыть самые важные identity/access gaps;
3. добавить небольшие, но системно правильные фичи;
4. не строить большие future systems до появления надёжных contracts.

---

## 2. Product Core That Must Stay Protected

Главное ядро проекта:

1. **Shell** — ощущение внутренней программы, а не сайта.
2. **Character Gate** — переход от registered user к player.
3. **Forum** — социальное фойе и живая коммуникация.
4. **Arcs** — главный gameplay через литературные posts.
5. **Profile** — связка account identity + character identity + rewards.
6. **Pager** — будущая единая коммуникационная нервная система.
7. **World** — публичная глубина сеттинга.

Любая новая фича должна усиливать хотя бы один из этих слоёв и не ломать остальные.

---

## 3. Immediate Engineering Rule

Не строить новую большую систему, пока не понятны:

- access model;
- data ownership;
- read/write path;
- empty/locked states;
- failure mode;
- admin repair path, если фича влияет на деньги, предметы, approval или публикации.

Это особенно важно для:

- shop;
- rewards;
- reputation;
- pager;
- hidden lore unlocks;
- character review comments;
- global search.

---

## 4. Phase A — Specification Stabilization And Route Truth

**Goal:** привести продуктовую карту в состояние, пригодное для разработки.

### Work

- держать `PAGE_TO_PAGE_PRODUCT_SPEC_V1_2026_04_17.md` как active product canon;
- добавить route inventory по существующим страницам;
- отметить, какие страницы уже соответствуют spec, какие являются placeholder, какие требуют redesign;
- выделить страницы, где old implementation conflicts with new product truth.

### Output

- route audit table;
- list of mismatches;
- first implementation backlog.

### Why First

Перед кодом нужно знать, что именно мы исправляем:

- UI;
- access;
- wording;
- data model;
- route structure;
- or whole product behavior.

---

## 5. Phase B — Access And Identity Foundation

**Goal:** сделать переход `guest -> registered -> approved player` видимым и последовательным.

### Priority Features

1. Restricted-user profile banner.
2. Character approval status surfacing on `/profile`.
3. Locked sections pattern for profile/arcs/shop/forum.
4. Clear username vs character identity display rules.
5. Approved-player unlock list in code and UI.

### Why This Comes Early

Без этой фазы пользователь не понимает:

- что он уже получил после регистрации;
- почему он ещё не полноценный player;
- что откроется после approval;
- где заканчивается account identity and starts character identity.

### Engineering Notes

- Do not duplicate `/me`, `/profile` and `/u/[own-username]` logic long-term.
- `/me` is the canonical current-user surface.
- `/profile` should redirect to `/me`.
- `/u/[own-username]` should redirect to `/me`.
- Own profile and public profile should visually converge over time.
- Locked sections need reusable UI pattern.
- Access explanations must be explicit, not inferred from disabled buttons.

---

## 6. Phase C — Forum Social Layer Polish

**Goal:** приблизить forum к modern social-thread behavior without overbuilding.

### Priority Features

1. Category tiles with activity hints.
2. Locked category/thread preview states.
3. Better create-thread disabled states.
4. Mentions foundation if not already present.
5. Quote/reply-to design pass.
6. Report action polish.
7. News/broadcast presentation separation from normal threads.

### Not Yet

- full global unread for every thread;
- complex tags;
- full partial-quote editor if it requires heavy editor work;
- advanced social feed algorithms.

### Engineering Notes

Forum must remain fast.

Every feature added to thread read path needs performance awareness:

- do not overfetch interaction overlays;
- do not make first slice expensive;
- avoid turning every post into a multi-query object.

---

## 7. Phase D — Arcs Gameplay Reliability

**Goal:** protect the most valuable content path before adding economy complexity.

### Priority Features

1. Clear arc/chapter terminology and labels.
2. Character identity display in chapter posts.
3. Draft recovery UX improvement.
4. Chapter/arc status clarity: draft/open/closed/archived/hidden.
5. Location/date fields aligned with product truth.
6. Visibility states explained clearly.
7. Collaborator invite and permission clarity.

### Not Yet

- full automatic reward formula;
- reopen-cost economy;
- player-generated timeline;
- complex location integration;
- advanced reputation economy.

### Engineering Notes

Arcs are not forum posts.

They need:

- stronger draft safety;
- clearer publication state;
- less realtime pressure;
- no collaborative document editor;
- character identity instead of `@username` as primary display.

---

## 8. Phase E — Profile, Shop And Economy Base

**Goal:** create a usable player identity/reward surface without building the entire economy at once.

### Priority Features

1. Approved character card on profile.
2. Basic public `/u/[username]` profile composition.
3. Inventory as owned-items list.
4. Shop as shell-level storefront.
5. Eurodollar balance display.
6. Admin item grant / wallet repair path.
7. Purchase receipt path into future pager or current notification fallback.

### Not Yet

- full equipment skeleton;
- trade/gift economy;
- artifact-unlocked hidden profile sections;
- hidden lore unlocks;
- complex rarity taxonomy.

### Engineering Notes

Any money/item feature must have:

- transaction safety;
- idempotency where relevant;
- admin repair;
- user-visible confirmation;
- tests around balance/item ownership.

---

## 9. Phase F — Pager Foundation

**Goal:** build pager as unified inbox before building full messenger.

### Priority Features

1. Unified inbox data model.
2. System message types.
3. Unread count.
4. Mentions forwarded into pager.
5. Character application updates into pager.
6. Shop/reward receipts into pager.
7. Arc invites into pager.

### Not Yet

- full DM messenger;
- group chats;
- attachments;
- reactions;
- typing indicators.

### Engineering Notes

Pager must first be reliable delivery infrastructure.

Messenger can come later.

If pager starts as chat-first, it will compete with forum and create product noise.

---

## 10. Phase G — World Expansion

**Goal:** make `/world` feel like a serious public encyclopedia without entangling it with gameplay prematurely.

### Priority Features

1. Strong `/world` entry page.
2. Better section navigation.
3. Map as interactive reference.
4. Rules/mechanics as readable system documentation.
5. Economy explanation in mechanics.
6. Faction/location pages useful for character inspiration.

### Not Yet

- hidden lore unlock system;
- artifacts revealing map layers;
- episodes tied to map;
- player-generated timeline.

### Engineering Notes

World is mostly public and read-heavy.

It should be:

- easy to navigate;
- fast;
- not over-authenticated;
- not tied to volatile player data until needed.

---

## 11. Phase H — Artifact-Enabled Systems

**Goal:** add the unique “system features unlock through items” layer only after core loops are stable.

Candidate features:

- neuralink chip unlocks global search;
- artifact unlocks hidden world documents;
- item enables invisible mode;
- artifact reveals hidden locations;
- special item changes profile visibility/access.

### Why Later

These features are powerful, but dangerous if implemented too early.

They require:

- strong access model;
- shop ownership;
- inventory truth;
- pager delivery;
- world unlock model;
- privacy policy;
- admin repair.

---

## 12. First Concrete Backlog

The first implementation backlog should be small and surgical.

### B1. Profile Gate Banner

Status: initial implementation complete.

- Show restricted/approved character state on `/profile`.
- Link to `/characters`.
- Show pending/returned/approved states.
- Character application now supports a visual reference upload stored with the application form JSON.
- Shell now has a reusable right-rail slot; `/me` and `/u/[username]` use it for character state.
- `/me` and `/u/[username]` now have a first-pass arc chronology sorted by latest activity.
- Approved character identity is now centralized in a canonical server service used by profiles and chapter posts.
- `/users` now keeps its table shape while adding search, presence sorting, profile links, approved character names and inline quick preview.
- `/forum` now shows locked category previews and `/forum/[category]` has explicit locked access screens.
- `/forum` now surfaces latest visible thread activity on unlocked categories and suppresses activity hints for locked categories.

### B2. Locked Surface Component

Status: initial reusable component added.

- Reusable locked section UI.
- Works for profile/arcs/shop/forum.
- Shows required access and next action.

### B3. Forum Category Activity Tiles

Status: initial implementation complete.

- Improve `/forum` category cards.
- Add activity preview where cheap.
- Latest thread preview appears only for categories the current viewer can read.
- Hidden latest threads are suppressed for normal viewers and remain visible to admins.
- Keep performance budget in mind.

### B4. Character Identity In Arc Posts

- Ensure chapter posts display character identity, not only account identity.
- Audit data shape before UI change.

### B5. Draft Recovery UX

Status: first pass implemented for chapter post composer and character application.

- Make current browser draft behavior visible and trustworthy.
- User should know text is safe locally after failure.
- Chapter post composer now restores local drafts automatically when reopened.
- Character application now stores editable fields locally, restores them automatically, and clears local drafts after successful save/submit.
- Failed publish/save/submit paths should keep the editor state and tell the user the local draft is still stored in this browser.

### B6. Shop Route Decision

- Decide whether to introduce `/shop` inside shell.
- Treat `/world/shop` as temporary or storefront-only.

### B7. Pager Data Model Design

- Do not build full UI first.
- Design message types, receipts, unread and delivery rules.

---

## 13. Things To Avoid Now

Do not start with:

- full pager messenger;
- global search;
- hidden lore unlocks;
- complex economy formulas;
- multi-character accounts;
- full profile equipment skeleton;
- advanced forum unread across everything;
- AI character review;
- map-to-episode integration;
- player-generated world timeline.

These are good ideas, but they need stronger foundations.

---

## 14. Engineering Risk Register

### R1. Identity Confusion

Risk:

- account username and character identity get mixed.

Mitigation:

- forum/pager use `@username`;
- arcs use character identity;
- profile shows both.

Current implementation note:

- chapter post headers now use approved character identity in collapsed view;
- expanded chapter post header reveals account attribution through `@username`;
- future NPC/per-post identity override should be designed separately.

### R2. Access Drift

Risk:

- different pages enforce restricted/player rules differently.

Mitigation:

- reusable access helpers;
- locked UI component;
- route audit.

### R3. Economy Bugs

Risk:

- wrong balance, missing item, duplicate reward.

Mitigation:

- transaction discipline;
- admin repair;
- receipts;
- tests.

### R4. Writer Trust Loss

Risk:

- lost draft or post.

Mitigation:

- draft recovery UX;
- autosave clarity;
- failure-state handling.

### R5. Forum Performance Regression

Risk:

- social features make thread reads expensive.

Mitigation:

- measured hot paths;
- avoid unnecessary overlays;
- cache-aware design;
- performance checks before large forum changes.

### R6. Pager Scope Creep

Risk:

- pager becomes chat app before it becomes reliable inbox.

Mitigation:

- build inbox/system messages first;
- postpone attachments/group chats/reactions.

---

## 15. Development Philosophy

The correct implementation style for this project:

- small but canonical changes;
- reusable contracts for access and identity;
- UI that reveals system depth without lying;
- no feature without failure state;
- no economy feature without repair path;
- no writer feature that risks text loss;
- no forum feature that ignores performance.

The project should grow like a system, not like a collection of cool screens.
