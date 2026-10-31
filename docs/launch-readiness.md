# Launch readiness

TypeLab v1 is a static single-page app. It has no backend, no account system, and no server-side
data. Launching therefore means producing a correct `dist/` build, serving it with the right
headers, and confirming the browser-only features still work on the deployed origin.

This document covers the pre-deploy gate, Cloudflare Pages setup, post-deploy checks, the manual
browser/device matrix, and rollback.

## Pre-deploy gate

Run every gate from a clean checkout before tagging a release. CI runs the same list on every push
to `main` and every pull request (`.github/workflows/ci.yml`).

```bash
npm ci
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run check:bundle
npm run test:e2e
```

Expected signals:

| Gate | Passing signal |
| --- | --- |
| Typecheck | `tsc -b` exits 0 |
| Lint | `eslint . --max-warnings=0` exits 0 |
| Format | `prettier --check` reports all files formatted |
| Unit | Vitest exits 0 (currently 308 tests across 35 files) |
| Build | Vite writes `dist/` |
| Bundle budget | `check:bundle` passes entry JS ≤ 160 kB, all JS ≤ 340 kB, all CSS ≤ 16 kB (gzip) |
| E2E | Playwright exits 0 on Chromium, Firefox, and WebKit (currently 23 tests per browser) |

The bundle budget is deliberately below the current measurements so a regression fails the gate
rather than silently shipping. Current measurement is roughly 120 kB entry JS, 276 kB all JS, and
6.5 kB CSS (gzip).

E2E runs against `npm run build && npm run preview` on `127.0.0.1:4173`. Install browsers once with
`npx playwright install chromium firefox webkit`.

## Cloudflare Pages setup

The deploy workflow (`.github/workflows/deploy.yml`) runs after the CI workflow for `main`
completes successfully, and on manual dispatch. It checks out the exact commit CI verified, builds
the app, and deploys `dist/` with Wrangler. A failing CI run never reaches production. The deploy
itself is skipped unless both secrets exist.

The workflow creates the Pages project named **`typelab`** if it is missing, then deploys with
`--branch=main` so the release is a production deployment rather than a preview. The live site is
**https://typelab-b1o.pages.dev** (Cloudflare assigned the unique `typelab-b1o` pages.dev
subdomain; the project name remains `typelab`).

1. Create a Cloudflare API token with the **Cloudflare Pages: Edit** permission for the target
   account.
2. Add the repository secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Run the **Deploy to Cloudflare Pages** workflow. The build step runs first; the deploy step is
   skipped with an `::notice::` when either secret is missing.
4. Optionally attach a custom domain in the Pages project settings. No app configuration changes
   are required; the app only uses same-origin URLs.

To create the project manually instead, use Direct Upload (not Git integration; GitHub Actions
owns the deploy) and name it `typelab`.

Build settings, when the project is configured in the dashboard instead:

- Framework preset: none / Vite
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: from `.node-version` (Node 24)

### Static assets and routing

- `public/_redirects` contains `/* /index.html 200`, so deep links such as `/results/:id`,
  `/shared?r=…`, and `/history` resolve to the SPA shell.
- `public/_headers` ships the production security and cache policy:
  - `Content-Security-Policy` with `default-src 'self'`, `script-src 'self'`,
    `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: blob:`, `font-src 'self' data:`,
    `connect-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, and
    `frame-ancestors 'none'`.
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
    `X-Frame-Options: DENY`, and a restrictive `Permissions-Policy`.
  - `/assets/*`: `Cache-Control: public, max-age=31536000, immutable`. Vite fingerprints these
    filenames.
  - `/boot.js`: `Cache-Control: public, max-age=0, must-revalidate`. It reads saved settings before
    first paint, so a stale copy would flash the wrong theme.
- `script-src 'self'` is why the pre-paint theme/motion logic lives in `public/boot.js` instead of
  an inline `<script>` in `index.html`. Do not reintroduce inline scripts without changing the
  policy.

`artifacts/csp-check.mjs` serves `dist/` with the production CSP and exercises the bench, a
completed result, a shared snapshot, settings, and history while failing on any console or page
error. Run it after changing the policy:

```bash
npm run build
node artifacts/csp-check.mjs
```

(The file is a local verification helper; `artifacts/` is gitignored.)

## Post-deploy smoke checks

Run these against the deployed URL on a desktop browser and one phone.

1. `/` loads, the prompt is visible above the fold, and typing starts a run.
2. Complete a 10-word run; the result page shows net WPM, accuracy, and the share panel.
3. Reload the result page; the run is still present.
4. Open the shared link in a private window; the snapshot renders without local history.
5. Download the PNG share card; it is 1200×630.
6. Open `/settings`; change the theme, reload, and confirm no light/dark flash.
7. Save a preset, return to the bench, apply it, and reload.
8. Export a backup, clear site data, import the backup, and confirm runs and settings return.
9. Open DevTools → Network for `index.html`, `/boot.js`, and an hashed asset; confirm the CSP,
   immutable caching on `/assets/*`, and revalidation on `/boot.js`.
10. Confirm there are no console errors or blocked requests.

## Manual browser and device matrix

Automated coverage runs Chromium, Firefox, and WebKit on desktop. The following still need a
human pass before a public launch announcement, because they exercise real keyboards, mobile
keyboards, and OS preferences that Playwright cannot fully reproduce.

| Environment | What to check |
| --- | --- |
| Chrome (desktop, Windows/macOS) | Typing, backspace, IME/composition, key sounds, theme flash, share download |
| Firefox (desktop) | Typing, backspace, share download, reduced motion via OS setting |
| Safari (macOS) | Typing, backspace, share download, font rendering, safe-area layout |
| iOS Safari | Keyboard opens on tap, typing surface stays visible, no page zoom on focus, share/download behaviour |
| Android Chrome | Keyboard opens, layout above fold, backspace, share/download behaviour |
| Screen reader (one of VoiceOver/NVDA) | Bench prompt announced, result headings navigable, settings groups labelled |
| Keyboard only | Tab order through nav, toolbar, typing input, settings, and history; visible focus |

Record the browser, OS, device, date, and result for each row in the release notes rather than
assuming the automated suite covers it.

## Known limitations at launch

- Data is local to a browser profile. There is no sync and no server backup; export is the durable
  path. Clearing site data deletes settings and history.
- Shared links are encoded snapshots in the URL fragment. They are not server-verified and can be
  edited by the sender; the shared page says so. Encoded links are capped at 1,800 characters
  before base64url encoding.
- Custom-text runs are stored with the run and are marked unranked for personal bests.
- The app requests persistent storage, but browsers may still evict data under pressure.
- There is no analytics, error reporting, or remote logging by design. Failures are diagnosed from
  local reproduction.
- Recharts is lazy-loaded as its own chunk; first chart render fetches it on demand.
- Safari private browsing can make IndexedDB behave inconsistently; export before relying on it.

## Rollback

Cloudflare Pages keeps every deployment. To roll back:

1. Open the Pages project → **Deployments**.
2. Find the last known-good deployment and choose **Rollback to this deployment**.

Rolling back the static shell does not migrate or delete local data. Settings migrations are
forward-only and additive; an older build ignores unknown fields and keeps the stored JSON, but
newer fields (for example presets) will not appear until a newer build returns. Backups taken on
the newer build remain importable on the older build only if their settings schema version is
supported, so prefer rolling forward with a fix when schema changes are involved.
