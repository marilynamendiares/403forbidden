# Refactor First Pass Audit

Date: 2026-04-03

## Scope Completed

The first major refactor pass is effectively complete across the project core.

The main outcomes:

- Product truth was normalized around `arcs`, `users`, canonical profile/settings routing, and current access rules.
- Runtime and schema naming were migrated from `book/books` to `arc/arcs`.
- `app` server pages were cleared of direct Prisma access. Page-level data now goes through services, repos, or view-model helpers.
- `app/api` is now mostly a thin transport layer over canonical `server/services` and `server/repos`.
- Session/auth handling was centralized and removed from scattered manual patterns.
- Shell/terminal geometry was reworked into a more honest layered architecture.
- Hot paths around forum, chapters, posts, notifications, presence, and lock/presence transport were simplified and made more predictable.
- Large client files were decomposed into hooks, helpers, and UI primitives.

## What Was Wrong Before

The dominant pre-refactor problems were structural:

- the same business rule lived in multiple routes, pages, and components;
- pages were reaching into Prisma directly;
- routes were acting as transport, service, and policy layer at the same time;
- many client components handled fetch, state, transport, rendering, and UI flow in one file;
- shell geometry and sticky behavior were driven by duplicate offsets and layered compensations;
- simple UI ideas were often implemented through heavier local mechanisms than necessary.

## What Is Correct Now

The codebase is now closer to a stable layered model:

- `app` pages are presentation and orchestration;
- `app/api` routes are transport;
- `server/services` hold business logic;
- `server/repos` hold read/query logic;
- shared transport helpers exist for common API concerns;
- shell/layout metrics have canonical sources instead of repeated magic numbers;
- repeated client transport patterns were moved out of large components.

## Intentional Exceptions Remaining

These are still present and are acceptable for now:

### `src/app/api/lock/route.ts`

Still contains direct Prisma reads.

Reason:
- it is a hot path with highly specific lock-access resolution;
- the current remaining direct reads are intentional and already optimized relative to the previous state.

### `src/app/api/upload/avatar/route.ts`

Still contains direct Prisma transaction usage.

Reason:
- avatar slot reservation is tightly coupled to presign creation;
- the transactional reserve pattern is valid and not accidental.

### `src/app/api/uploads/images/route.ts`

Still returns raw `new Response(...)` for binary image streaming.

Reason:
- this is a binary/file streaming endpoint, not a JSON API;
- wrapping this in generic JSON helpers would be the wrong abstraction.

### `src/app/api/events/stream/route.ts`

Still returns raw `new Response(stream, ...)`.

Reason:
- this is SSE transport;
- it intentionally operates outside the normal JSON helper shape.

### Remaining route-level `console.error(...)`

Some route handlers still log server-side failures.

Reason:
- these logs are not architecture drift by themselves;
- they can be normalized later, but they are not structural blockers for the first pass.

## First-Pass Result

The first pass should be considered successful because the project core no longer behaves like a collection of unrelated implementation islands.

The most important architectural shifts already happened:

- page layer was separated from data access;
- route layer was separated from business logic;
- naming drift was removed from the main product surface;
- shell geometry was made more truthful;
- sticky and overlay mechanics were corrected where the underlying architecture was wrong;
- client transport duplication was significantly reduced.

## Recommended Next Step

The second pass should not repeat the same work indiscriminately.

It should focus on:

- deeper performance review of hot paths;
- query shape and DB-read optimization for forum/arcs traffic;
- remaining large UI/layout files that are still heavier than their underlying idea;
- selective polish of intentional exceptions only if a stronger architecture becomes obvious.
