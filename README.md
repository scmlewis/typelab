# TypeLab

A polished, local-first typing test platform: timed and word-count tests, live WPM/accuracy, detailed results, history, themes, and export/import. No accounts, no server, no tracking.

## Status

**Phase 1 — foundation complete; engine next.**
The local-only plan is approved. Hosting: Cloudflare Pages. Visual direction: “lab notebook”. The app shell, tooling, design tokens, and browser test harness are in place. Typing features are not implemented yet.

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

Requirements: Node 22.12 or newer (`.node-version` pins 24) and npm 10 or newer. No environment variables or backend are required.

```bash
npm install
npm run dev
```

Quality gates:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
npm run test:e2e
```

End-to-end tests need the Playwright browsers once:

```bash
npx playwright install chromium firefox webkit
```

## Hosting

The app is a static SPA intended for Cloudflare Pages:

- Build command: `npm run build`
- Output directory: `dist`
- SPA fallback: `public/_redirects` rewrites all routes to `index.html`
- Preview deployments: one per pull request/branch

The deploy workflow expects a Cloudflare Pages project named `typelab` and these GitHub Actions secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Until both are configured, the workflow builds successfully and skips deployment with a notice.

## Data

There is no server. Settings will live in `localStorage`, history in IndexedDB (Dexie), and export/import will be the backup path. Clearing browser storage deletes local data.
