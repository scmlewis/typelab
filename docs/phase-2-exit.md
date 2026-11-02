# Phase 2 exit report

**Status: draft.** This document is finalised after the accent-palette slice. Slice 1 (storage,
history, and quality) has landed; Spanish/French content packs and curated accents are still pending.

## What this slice closes

Slice 1 of the v1 close-out removed the last Phase 2 gaps that did not need new content or a
settings migration:

- History loads in 100-run pages instead of stopping permanently at the newest 100.
- Settings shows how many runs are stored, an estimated history size, the oldest run, and how many
  runs are older than 90 days.
- Two manual cleanup actions — delete older than 90 days, and delete all runs — each behind a
  two-step confirmation and an export reminder.
- Social metadata was completed and its static card dimensions are now pinned by a test.
- Every declared route is covered by a route-table test.
- Page labels share one `Eyebrow` treatment; the field-notes band is a sibling of the bench rather
  than a nested section; the About page says “no application server” rather than “no server”.
- A 375×667 above-the-fold check joined the existing 390×664 check.

Still pending in Phase 2, handled by the later slices:

- Spanish and French word lists and language-matched quotes (slice 2).
- Curated accent palettes with a v6 settings migration (slice 3).
- The completed mode regression matrix and the final test/bundle numbers (after slice 3).

## Evidence

Full local gate, run on `main` before the slice was pushed:

| Gate | Command | Result |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | pass |
| Lint | `npm run lint` | pass, 0 warnings |
| Format | `npm run format:check` | pass, all files formatted |
| Unit | `npm test` | pass, 339 tests across 40 files |
| Build | `npm run build` | pass |
| Bundle budget | `npm run check:bundle` | pass |
| E2E | `npm run test:e2e` | pass, 81 tests across Chromium, Firefox, WebKit |

### Bundle after this slice

| Asset | Budget | Measured |
| --- | --- | --- |
| Entry JS | ≤ 160 kB | 133.8 kB |
| All JS | ≤ 340 kB | 278.7 kB |
| CSS | ≤ 16 kB | 6.6 kB |

Headroom is 26.2 kB entry, 61.3 kB all JS, and 9.4 kB CSS. The slice added about 1.3 kB to all JS
against the previous 277.4 kB, concentrated in the settings chunk that now carries the storage panel.

### Production

| Check | Result |
| --- | --- |
| CI on `main` | pass — run 41393595882 at `9572f1c`, 81/81 E2E |
| Cloudflare Pages deploy | pass — run 41393960462, live asset `index-DoBLXCjk.js` |
| Production smoke | pass — 14/14 checks, no console or page errors |

The smoke ran against https://typelab-b1o.pages.dev in a fresh Chromium profile at 375×667 and
verified: the typing surface above the fold, a completed ten-word run, the corrected About copy, the
saved run in history, the storage summary, the `#backup` reminder link, the disabled older-than
control on fresh history, the two-step delete-all confirmation, cancel leaving the run intact,
deletion through to “Deleted 1 run.”, the empty state, and history reflecting the deletion.

An earlier deploy of `0786d84` passed the same smoke before the singular-copy fix; `9572f1c` is the
deployed commit recorded above.

## Mode regression matrix

Cell key: **A** — covered by the automated Playwright/unit suite; **M** — needs a manual pass;
**–** — not covered. Every cell runs on Chromium, Firefox, and WebKit unless noted. Slice 1 records
the skeleton; slice 3 fills the language and accent rows.

| Mode | Policy | Desktop light | Desktop dark | Phone light | Phone dark |
| --- | --- | --- | --- | --- | --- |
| Timed 15 s | free | M | M | M | M |
| Timed 30 s | free | A (live stats, restart) | M | A (above the fold) | M |
| Words 10 | free | A | A (dark-theme run) | A (above the fold) | M |
| Words 25 | strict | M | M | M | M |
| Words 25 | no-backspace | A (backspace) | M | M | M |
| Quote | free | A | M | M | M |
| Custom | free | A | M | M | M |

Notes:

- “A” for the backspace row covers the correction path, not a completed no-backspace run.
- Strict-policy completion is covered by engine unit tests, not by Playwright.
- The phone column is a 375–390 px viewport; it is not a real device.
- Light/dark is covered once per control (theme persistence and axe), not for every mode.

## Known limitations after this slice

- Bulk deletion is manual and irreversible, and it removes history only. Settings, presets, and
  metadata survive. Export first; there is no undo.
- Another open tab does not see a bulk deletion until it refreshes. Per-row deletion has the same
  behaviour.
- History loads 100 rows at a time. The trend chart covers the newest 200 loaded rows and says so
  when more are loaded.
- Offset paging is single-tab-safe only: a save landing between requests can shift a later page.
  Rows are deduplicated by id, so nothing repeats; a row can be skipped until refresh.
- The storage figure is an estimate of the TypeLab history payload (UTF-8 JSON length), not the
  browser’s storage quota or IndexedDB overhead.
- There is still no interface translation; the language work in slice 2 changes words and quotes
  only.

## Outstanding manual checks

- Real Spanish and French keyboard layouts and dead-key composition (after slice 2).
- iOS Safari and Android Chrome on physical devices.
- A screen-reader pass over the bench, history, and settings.
- A full manual run of the mode matrix cells marked **M**.
