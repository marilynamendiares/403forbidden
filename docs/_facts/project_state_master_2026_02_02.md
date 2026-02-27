# PROJECT STATE MASTER — 403FORBIDDEN

**Last updated:** 2026-02-02  
**Timezone:** Europe/Riga  
**Purpose:** Single source of truth for *current* implementation state + intentional design locks, so future changes don’t accidentally break the project.

---

## 0. Project Overview

**403Forbidden** is a cyberpunk role‑play forum / collaborative writing platform built on **Next.js App Router**, with a strong emphasis on:

- **SSR-first + server guards** (UI hiding ≠ security)
- **explicit geometry & artboard scaling** for key “hero” blocks
- **terminal / dossier / system UI** visual language
- **player gate** via character approval (RESTRICTED → PLAYER)

---

## 1. Tech Stack

### Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS (used surgically; explicit layout > abstractions)

### Backend / Infra
- Prisma + Postgres (Neon)
- Auth (NextAuth/Auth.js credentials flow)
- Upstash Redis (locks / presence / realtime plumbing)
- R2 (uploads: avatar + chapter images)
- SSE stream endpoint exists (client hooks present)

---

## 2. Roles & Access Tiers (Canonical)

### 2.1 Tiers
- **GUEST** — not logged in
- **RESTRICTED** — logged in, but **no approved character**
- **PLAYER** — logged in, has at least one **APPROVED** character application
- **ADMIN** — privileged access (admin pages / admin APIs)

### 2.2 Source of truth
A user is a **PLAYER** if:
- `characterApplication.status === "APPROVED"`

**Implementation anchor:** `src/server/player.ts` (helper guards: `isPlayer`, `requirePlayer`, `getApprovedCharacter`).

---

## 3. Major Modules — What Exists Right Now

This section is a “map” of what is already present in the repo (routes + APIs + key server services).

### 3.1 Auth / Account flows
**Routes (UI):**
- `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password`

**API:**
- `src/app/api/auth/*` (verify email, resend code, forgot/reset password, session)

**Note:** Auth flows exist and are integrated; most other areas rely on these guards.

---

### 3.2 Character Applications (Player Gate) — ✅ Implemented

**User-facing:**
- `/characters` list page
- `/characters/[id]` application view/edit page

**Admin-facing:**
- `/admin/characters` queue
- `/admin/characters/[id]` review page

**API:**
- `/api/characters` + `/api/characters/[id]`
- `/api/characters/[id]/submit`
- `/api/admin/characters` + `/api/admin/characters/[id]`
- `/api/admin/characters/[id]/review`

**Status workflow (current):**
`DRAFT → SUBMITTED → UNDER_REVIEW → (NEEDS_CHANGES → resubmit loop) → APPROVED`

**Important:** Once gated content moved under `(protected)`, RESTRICTED cannot access Books.

---

### 3.3 Books / Chapters (Protected content) — ✅ Present

**Protected route group:**
- `src/app/(protected)/layout.tsx`
- `src/app/(protected)/books/*`

**APIs (books, chapters, posts):**
- `/api/books/*`
- chapter open/close routes exist (`/close`, `/open`)
- chapter post list/create routes exist (`/posts`)
- per-post endpoints exist: like / reputation

**Editor / viewer components exist:**
- `RichChapterEditorClient`, `RichPostEditor`, `RichPostViewer`, etc.
- Sanitization pipeline exists: `src/server/render/sanitizeHtml.ts`

---

### 3.4 Economy — Shop & Inventory — ✅ Present

**World Shop (UI):**
- `/world/shop` (SSR + client buy UX)

**Shop API (canonical v1):**
- `/api/shop` + `/api/shop/buy`

**Legacy world shop API routes still exist in tree (cleanup candidate):**
- `/api/world/shop` + `/api/world/shop/buy`

**Inventory:**
- `/u/[username]/inventory`

**Seeding scripts:**
- `scripts/seed-shop.ts`
- `scripts/seed-forum-categories.ts`

---

### 3.5 Forum — ✅ Present

**UI:**
- `/forum` index
- `/forum/[category]` category page
- `/forum/[category]/[slug]` thread page

**API:**
- `/api/forum/categories`
- `/api/forum/categories/[category]/threads`
- `/api/forum/categories/[category]/threads/[slug]`
- `/api/forum/categories/[category]/threads/[slug]/posts`
- `/api/forum/posts/[id]`

**ACL:**
- Enforced server-side in `src/server/forumAcl.ts` (and related server helpers).
- Key policy (already agreed):  
  - **RESTRICTED:** can reply in *allowed intro/support areas* but **cannot create threads anywhere**  
  - **PLAYER:** can create threads in most categories (except admin-only + “welcome/support” where only admins create “main” threads)

---

### 3.6 Notifications & Realtime Plumbing — ✅ Present (baseline)

**UI:**
- `/notifications` page
- Notification bell / feed components exist

**API:**
- `/api/notifications` (+ unread-count, count, mark-read)
- Outbox drain endpoint exists: `/api/admin/outbox/drain` (admin tool)

**Realtime:**
- SSE endpoint exists: `/api/events/stream`
- Client hooks exist: `useEventStream`, `useRealtime`, `useNotificationsFeed`

This is enough for incremental realtime polish later (no need to re-architect).

---

### 3.7 Presence — ✅ Present (used by Players page)

**API:**
- `/api/presence/ping`
- `/api/presence/list`

**Intended usage:**
- Client pings periodically, server returns presence state list.

---

### 3.8 PLAYERS page — ✅ Skeleton implemented (latest addition)

**UI:**
- `/players` + `players-table.tsx`

**Current behavior (baseline locked):**
- Table of users (players + restricted) with **live presence**
- Statuses: `CONNECTED / DISCONNECTED / GUEST TUNNEL`
- Battery indicator shown in grid row
- Precise grid layout + visual style treated as “baseline” (do not casually reflow)

This is currently a **layout-critical** area similar to WorldHero: changes should be patch-style and measured.

---

### 3.9 WORLD module — ✅ Pages exist + WorldHero is “design lock”

**Routes (UI):**
- `/world` overview (entry)
- `/world/lore`, `/world/timeline`, `/world/factions`, `/world/locations`
- `/world/systems` + `/world/systems/{rules,mechanics,faq}`
- `/world/map` exists as a page (currently placeholder UI)

**Components:**
- `src/components/world/WorldHero.tsx` (hero tile)
- `src/components/Globe.tsx` (Three.js globe)
- `src/components/BackCornerButton.tsx`

---

## 4. WORLDHERO — Locked Geometry & Rendering Rules (CRITICAL)

This section exists because WorldHero is intentionally “over-engineered” to preserve exact visuals.

### 4.1 Artboard scaling model (do not convert to responsive reflow)
- Fixed artboard coordinates, then uniform scaling via CSS variable `--hero-s`.
- No breakpoint reflow inside the hero; scaling preserves geometry.

### 4.2 Baseline constants (locked)
- `BASE_W = 1600`
- `TILE_H = 240`
- `DISCLAIMER_H = 72`
- Columns: `LEFT_W = RIGHT_W = 380` (current baseline)
- `RAIL_W = 16`, `PANEL_W = 388`
- `SIDE_LABEL = "DEN HAAg"` (intentional spelling)
- Bracket rows list + hover rectangle logic are baseline-locked.

### 4.3 OVERVIEW title stack (locked)
- Uses `public/0verv1ew-fill.svg` + `public/0verv1ew-outline.svg`
- Outline layers rendered via CSS masks (not images)
- Cut/shift variables locked:
  - `o1-cut = 35%`, `o1-shift = 90%`
  - `o2-cut = 70%`, `o2-shift = 143%`

### 4.4 Globe (locked tuning)
- Uses `Line2/LineMaterial/LineGeometry` for true pixel-width lines.
- Grid density & tilt tuned manually; occluder sphere prevents back-face bleed.
- Subtle parallax: cursor down → globe up (inverted).

### 4.5 Right panel (barcode + eject) rules
- Equal spacing: left padding = gap = right padding
- Barcode SVG should be unified geometry to avoid stroke artifacts.

---

## 5. Repo Map — High-Signal Paths

Use this to quickly find where to patch.

- World hero: `src/components/world/WorldHero.tsx`
- Globe: `src/components/Globe.tsx`
- Players: `src/app/players/page.tsx`, `src/app/players/players-table.tsx`
- Presence: `src/app/api/presence/*`
- Notifications: `src/app/api/notifications/*`, `src/components/NotificationBell.tsx`
- SSE: `src/app/api/events/stream/route.ts`, `src/hooks/useEventStream.ts`
- Character gate: `src/app/characters/*`, `src/app/admin/characters/*`, `src/server/player.ts`
- Forum: `src/app/forum/*`, `src/app/api/forum/*`, `src/server/forumAcl.ts`
- Books: `src/app/(protected)/books/*`, `src/app/api/books/*`
- Shop: `src/app/world/shop/*`, `src/app/api/shop/*`, `scripts/seed-shop.ts`

---

## 6. Known Gotchas / House Rules

### 6.1 Next.js App Router params
In some routes/pages, `params` may be a Promise; don’t access `context.params.foo` without awaiting if the type forces it.

### 6.2 Tailwind “Unknown at rule @apply/@theme” warnings in VS Code
This is editor-language-mode/extension config, not runtime.  
If VS Code resets the file mode from Tailwind to plain CSS, warnings reappear.

### 6.3 Security rule
UI hiding is not security. All write actions must be gated in server routes.

---

## 7. Cleanup Candidates (only remove when confirmed)

- Legacy endpoints: `/api/world/shop/*` exist alongside `/api/shop/*` → decide whether to delete or hard-redirect.
- Any leftover `/archive/*` artifacts should be treated as legacy/future-only (current canonical module is `/world`).

---

## 8. Next Steps (closest, realistic)

1. **Forum ACL iteration (restricted mode):** enforce “no thread creation for restricted” on API + ensure category visibility is consistent.
2. **Players page polish:** keep baseline grid, add filters/sorting/search only if it does not break geometry.
3. **Notifications polish:** mark-read UX, unread counters, and SSE event coverage.
4. **World map:** keep as placeholder but start scoping player-only visibility + future data model.

---

## 9. Final Note

If something here looks strict — that’s intentional.  
This file exists to prevent “helpful refactors” from breaking carefully tuned layout and gate logic.
