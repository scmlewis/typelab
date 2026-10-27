# TypeLab

A polished, local-first typing test platform: timed and word-count tests, live WPM/accuracy, detailed results, history, themes, and export/import. No accounts, no server, no tracking.

## Status

**Phase 1 — foundation in progress.**
The local-only plan is approved. Hosting: Cloudflare Pages. Visual direction: “lab notebook”. No product features are implemented yet.

## Product scope

v1 is deliberately local-only:

- Settings in `localStorage`, history in IndexedDB (Dexie).
- Versioned JSON export/import and CSV export as the backup path.
- No accounts, cloud sync, public profiles, leaderboards, or remote backup.
- Client-side sharing only: text summary, image card, optional encoded URL.

See [ADR 0005](docs/decisions/0005-local-only-v1.md) for the decision and its consequences.

## Documents

| Document | Purpose |
| --- | --- |
| [Product specification](docs/product-spec.md) | Original requirements, with the local-only scope decision noted |
| [Repository audit](docs/phase-0/00-repository-audit.md) | What exists today, toolchain, local conventions |
| [Architecture](docs/phase-0/01-architecture.md) | Stack, module boundaries, engine, scoring, local data |
| [Feature checklist](docs/phase-0/02-feature-checklist.md) | P0/P1/P2 mapped to phases, cloud scope deferred |
| [Data model](docs/phase-0/03-data-model.md) | Local schema, backup format, migrations |
| [Risk register](docs/phase-0/04-risk-register.md) | Risks, likelihood/impact, mitigations |
| [Implementation plan](docs/phase-0/05-implementation-plan.md) | Prioritised phases, tasks, exit criteria |
| [Project checklist](PROJECT_CHECKLIST.md) | Living delivery checklist |

Architecture decision records live in [`docs/decisions/`](docs/decisions/).

## Stack

- React 19 + TypeScript (strict) + Vite + Tailwind CSS 4
- React Router 7, Recharts, Zod, Dexie
- Vitest + React Testing Library + Playwright
- Cloudflare Pages with preview deployments

## Local development

Not yet available. Setup instructions will be added with the Phase 1 scaffold.
