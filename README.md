# TypeLab

A polished, local-first typing test platform: timed and word-count tests, live WPM/accuracy, detailed results, history, themes, and export/import. No accounts, no server, no tracking.

## Status

**Phase 2 — advanced typing in progress.**
The local-only plan is approved. Hosting: Cloudflare Pages. Visual direction: “lab notebook”. Timed (15–120 s), word-count (10–100), classic-quote, and pasted-custom-text tests run end to end with live WPM, raw WPM, accuracy, character feedback, restart, and a results summary. Settings persist in `localStorage`; completed runs persist in IndexedDB and appear at `/history` with a mode filter, an excluded-run toggle, and deletion. Each run opens at `/results/:id` with full statistics, its configuration, a per-second speed chart, and a personal-best comparison for its category. Appearance supports light, dark, or system themes and a system/reduced/full motion preference, both applied before first paint, plus mono/sans/serif type, three sizes, three text widths, caret style and blinking, and opt-in synthesised key sounds. All of it is saved with a versioned settings migration. Named preset setups can be saved from the settings page and applied in one click from the bench, and they travel inside settings backups. The settings page exports a versioned JSON backup (settings plus every run), a CSV history, and imports a validated backup with duplicate detection and an optional settings replace. History charts net WPM and accuracy across the filtered runs. Finished runs can be copied as a text summary, downloaded as a PNG card, or encoded into a size-capped `/shared` link that renders read-only without touching local history. Additional languages are next.

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
| [Third-party notices](docs/third-party-notices.md) | Word-list source and license |

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
- Security and caching: `public/_headers` sets a strict same-origin CSP, denies framing, and
  fingerprinted assets are cached immutably. `/boot.js` revalidates so the pre-paint theme never
  goes stale.
- Bundle budget: `npm run check:bundle` fails the build when gzipped entry JS exceeds 160 kB, all
  JS 340 kB, or all CSS 16 kB.

The deploy workflow expects a Cloudflare Pages project named `typelab` and these GitHub Actions secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. It runs only after CI passes for `main` (or on manual dispatch). Until both secrets are configured, the workflow builds successfully and skips deployment with a notice.

See [docs/launch-readiness.md](docs/launch-readiness.md) for the full pre-deploy gate, Pages setup, post-deploy smoke checks, manual browser/device matrix, known limitations, and rollback.

## Data

There is no server. Settings live in `localStorage`, history in IndexedDB (Dexie), and a versioned backup file is the durability path. Clearing browser storage deletes local data, so the settings page exports settings and runs together.

Custom text is stored as part of the run configuration. It stays in this browser until you delete the run, and it is included when you export a backup. Repeated whitespace and line breaks are reduced to single spaces before a custom run starts.
