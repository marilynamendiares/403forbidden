# 403Forbidden

`403Forbidden` is a written roleplay platform built with Next.js, Prisma and Postgres.

The project combines four main layers:

- `Forum`: social entry point, onboarding, help, announcements, community talk
- `Arcs`: the main gameplay layer for collaborative writing and roleplay stories
- `World`: lore/reference/archive-style encyclopedia for the setting
- `Terminal + Shell`: the core interface identity of the project

The current product truth lives in:

- [PRODUCT_BIBLE_V3_2026_04_03.md](/Users/inokentykonovalov/projects/personal/403forbidden/docs/PRODUCT_BIBLE_V3_2026_04_03.md)
- [ACCESS_MATRIX_V1_2026_03_31.md](/Users/inokentykonovalov/projects/personal/403forbidden/docs/ACCESS_MATRIX_V1_2026_03_31.md)
- [ARCHITECTURE.md](/Users/inokentykonovalov/projects/personal/403forbidden/docs/ARCHITECTURE.md)
- [PROJECT_EXECUTIVE_REVIEW_V1_2026_04_04.md](/Users/inokentykonovalov/projects/personal/403forbidden/docs/PROJECT_EXECUTIVE_REVIEW_V1_2026_04_04.md)
- [ROADMAP_NEXT_5_PHASES_V1_2026_04_04.md](/Users/inokentykonovalov/projects/personal/403forbidden/docs/ROADMAP_NEXT_5_PHASES_V1_2026_04_04.md)
- [docs/README.md](/Users/inokentykonovalov/projects/personal/403forbidden/docs/README.md)

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- NextAuth/Auth.js
- Redis / SSE / realtime plumbing
- R2 uploads

## Product Notes

- `Arcs` is the canonical product and data name.
- `Users` is the canonical UI name for the population list. It includes both approved players and registered users.
- `World` is a fullscreen lore/reference layer and is intentionally separate from the main shell.
- `Pager` is planned as a future messaging + system inbox layer, but it is not the current implementation priority.

## Current Priority

The project has completed its first major refactor and initial performance packages.

Primary goals now:

- harden production-critical flows;
- improve observability and performance discipline;
- mature forum and writer hot paths for scale;
- prepare `WORLD` and `PAGER` as the next strategic product phases.

## Development

Install dependencies and run the dev server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful Scripts

```bash
pnpm build
pnpm lint
pnpm seed:forum
pnpm seed:shop
pnpm arcs:seed-fixtures
pnpm arcs:rebuild-discovery
pnpm migrate:content-html
pnpm migrate:media-keys
```

## Repo Guidance

- Treat `docs/_facts/*` as historical snapshots, not current product truth.
- Treat `docs/archive/*` as historical engineering paperwork, not active canon.
- Prefer the product terminology from the product bible in docs and UI.
- Be careful with shell/terminal architecture changes: this is part of the project's core identity, not just layout code.
