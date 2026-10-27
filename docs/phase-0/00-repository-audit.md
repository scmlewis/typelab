# Phase 0 — Repository and Design Audit

**Date:** 2026-10-27  
**Scope:** `C:\Github\(Web app)\TypeLab` and read-only inspection of sibling projects for local conventions.

## 1. What exists in TypeLab

| Check | Result |
| --- | --- |
| Directory contents | Empty |
| Git repository | No (`.git` absent) |
| `package.json` / lockfile | None |
| Source, tests, assets | None |
| Deployment config (`vercel.json`, `netlify.toml`, `wrangler.*`, `_redirects`) | None |
| Supabase config/migrations | None |
| Environment files / secrets | None |
| README / docs | None |
| CI workflows | None |

**Conclusion:** TypeLab is a true greenfield project. There is no existing implementation to preserve, no migration burden, and no compatibility constraint. The Phase 0 rule "do not overwrite an existing project" is satisfied.

## 2. Available toolchain

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | v24.11.0 | Current; supports Vite, Vitest, Playwright |
| npm | 11.6.1 | Use npm unless the owner prefers pnpm |
| pnpm | Not installed | Would need a global install |
| Git | 2.55.0 | Repository not yet initialised |
| Docker | Not verified | Not required for local-only v1 |

## 3. Local project conventions (read-only survey)

The parent folder contains ~24 sibling web projects. They are not constraints, but they show the owner's established habits:

- **React is the default UI framework.** Most projects use React + Vite; a few use Next.js.
- **npm is the package manager** in every inspected sibling.
- **GitHub is the source host** (`github.com/scmlewis/...`).
- **GitHub Actions + GitHub Pages** is a recurring deploy pattern (e.g. `chromatique`, `habit_tracker`, `gaming_hub`).
- **Tailwind CSS 4** is used in recent Vite projects (`ParkingHK`, `sushi_queue`).
- **Recharts** is the most common charting library (`hk_school_finder`, `sushi_queue`, `Weather_dashboard`).
- **Dexie (IndexedDB)** is already used for local data (`habit_tracker`, `strava-offline`).
- **Supabase** is used in `linkshrink` (Next.js), so the owner has prior exposure.

### What this means

1. The specification's frontend stack (React + Vite + Tailwind) fits the owner's existing habits; Supabase is deferred with the cloud scope.
2. `npm` is the sensible default; introducing pnpm would add setup friction without a demonstrated benefit.
3. GitHub Pages is the incumbent deployment pattern, but it does **not** cleanly satisfy the specification's requirement for separate preview deployments. This is a Phase 0 decision, not an assumption. See the [architecture proposal](01-architecture.md#13-hosting-and-environments).
4. There is no existing design system or component library shared across siblings. TypeLab will establish its own.

## 4. Existing deployment target

**None for TypeLab.** The owner's historical target is GitHub Pages, but that is a convention, not a commitment.

Recommended target: a static host with per-branch preview deployments and SPA rewrites. Cloudflare Pages is the primary recommendation; Vercel and GitHub Pages are documented alternatives.

## 5. Constraints and unknowns

| Item | Status | Impact |
| --- | --- | --- |
| Supabase project / credentials | Not present | Not required for local-only v1; cloud scope deferred |
| Hosting account / domain | Not confirmed | Blocks CI deploy configuration, not local development |
| Brand direction / visual assets | None | Needs sign-off before Phase 1 UI work |
| Target browsers | Spec says current stable Chrome, Edge, Firefox, Safari | Test matrix defined in the architecture |
| Mobile hardware for testing | Not confirmed | Manual mobile-keyboard verification will be required |
| Docker | Not verified | Not required; there is no local Supabase in v1 |

## 6. Audit outcome

- No code or configuration is at risk.
- The specification is the original source of truth; the product owner has since narrowed v1 to local-only.
- The proposed stack fits the owner's existing React/Vite/npm habits, with one open hosting decision.
- Phase 0 deliverables are documents only; no product code, dependencies, or services have been created.
