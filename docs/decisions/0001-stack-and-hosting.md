# ADR 0001 — Stack, Hosting, and Application Boundaries

- **Status:** Accepted
- **Date:** 2026-10-27
- **Deciders:** Product owner, implementation agent
- **Related:** [Architecture](../phase-0/01-architecture.md), [ADR 0005](0005-local-only-v1.md)

## Context

TypeLab is a greenfield typing test application. The original specification describes a local-first app with optional cloud accounts, sync, profiles, and leaderboards. The product owner has chosen a **polished local-only v1**: no backend, no accounts, no leaderboards. The repository is empty; there is no legacy stack to preserve.

The owner's sibling projects predominantly use React + Vite + npm, with Tailwind, Recharts, Dexie, and several deploy to GitHub Pages via GitHub Actions.

## Decision

Use a **static React single-page application with no backend**:

- React 19 + TypeScript (strict) + Vite.
- Tailwind CSS 4 with CSS-variable theme tokens.
- React Router 7, Recharts (lazy), Zod, Dexie.
- npm with a committed lockfile.
- Vitest + React Testing Library + Playwright.
- Settings in localStorage; history in IndexedDB via Dexie.
- Versioned JSON export/import and CSV export as the backup path.
- No Supabase, no auth, no server, no third-party analytics.
- Host on **Cloudflare Pages** with per-branch preview deployments and SPA rewrites. The visual direction is **“lab notebook”**: warm paper and deep ink, a restrained accent, editorial spacing, and a monospace test surface.

Boundaries:

- `src/engine/**` is framework-free and may not import React, Dexie, or feature UI.
- `src/data/**` owns persistence, repositories, and import/export.
- Feature folders own UI and orchestration, not domain rules.

## Consequences

**Positive**

- No server runtime, no auth/RLS/sync bugs, no custom backend, no Redis, no workers.
- Data never leaves the device; privacy is the default.
- The app works offline after load and is trivial to host.
- The core typing product ships much faster; effort goes into polish, analytics, accessibility, and input quality.
- Repository interfaces keep a future optional sync layer possible without rewriting the engine.

**Negative / trade-offs**

- No cross-device sync, accounts, public profiles, or leaderboards.
- Browser storage can be cleared or evicted; export/import is essential and must be prominent.
- Shared result links are client-side text/image/encoded URLs, not stable server-hosted links.
- A static host must be configured for SPA deep links.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Supabase-backed social platform | The riskiest and slowest part of the original spec; deferred indefinitely |
| Next.js full-stack | Typing is client-centric; SSR adds runtime and framework complexity without a demonstrated benefit |
| Cloudflare Workers + D1 + Durable Objects | Unnecessary infrastructure for a local-only app |
| GitHub Pages only | Weak preview-deployment story and SPA routing requires a 404 fallback |

## Follow-ups

- [x] Owner selects the hosting target: Cloudflare Pages.
- [x] Owner selects the visual direction: “lab notebook”.
- [ ] Create the project scaffold and CI.
- [ ] Record the actual Cloudflare Pages project and rewrite configuration in the README.
