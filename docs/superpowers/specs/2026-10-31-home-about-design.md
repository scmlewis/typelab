# Home context and About page — design

Status: proposed, awaiting approval.

## Intent

Give first-time visitors enough context to understand why TypeLab is different, without putting
anything between them and the typing test. The bench stays the product; the story lives below it
and on a dedicated page.

## Goals

- Keep `/` opening directly on the typing test, with the typing surface above the fold on phones.
- Add a compact “Why TypeLab” band below the test with three proof points and a link to `/about`.
- Add an `/about` page covering scoring, local data, input behaviour, and deliberate non-goals.
- Add global social metadata and a static 1200×630 Open Graph image.
- Replace the outdated “Phase 1 / local build” footer label with a current one and an About link.

## Non-goals

- A full marketing landing page at `/`.
- Server-side rendering, prerendering, or per-route crawler metadata.
- Analytics, tracking, accounts, or any backend.
- Changing the test flow, scoring, or persistence.
- Screenshots or a feature tour inside the app.

## Anti-goals

- A hero, modal, or welcome gate before the test.
- A fourth header nav item that crowds the 375 px layout.
- Duplicating the same copy on `/` and `/about`.
- Adding weight to the initial bundle for content only some visitors read.

## Constraints

- Static SPA on Cloudflare Pages; crawlers that do not execute JavaScript see only
  `index.html` metadata.
- Strict CSP: no inline scripts; metadata and the image are static files.
- Existing E2E test asserts the typing surface stays above the fold on a phone viewport.
- Design language is “lab notebook”: mono labels, numbered sections, warm paper, one accent.
- No third-party scripts or trackers.

## Approaches considered

1. **Full landing page at `/`** — strongest for a campaign, but adds a click for returning users,
   breaks the above-the-fold guarantee, and has weak SEO value in a client-rendered SPA. Rejected.
2. **Bench + below-fold band + `/about` + metadata** — preserves the product-first experience,
   gives context on the same page without blocking it, and provides a durable link target for
   launch posts and social bios. **Chosen.**
3. **`/about` only, no band** — least intrusive, but first-time visitors get no reason to click
   through. Rejected.
4. **Separate `/welcome` marketing route** — useful later for a campaign or SEO; deferred until
   there is traffic to justify it.

## What gets built

### Home (`/`)

Keep the existing header and bench markup. After the typing card, add one section:

- Mono label: `Field notes / 01`
- Heading: `Built for practice, not accounts.`
- Three short points with mono labels:
  1. **Local-first** — settings and runs stay in this browser; export is the backup.
  2. **Measured properly** — net and raw WPM, accuracy, consistency, and per-second charts.
  3. **Yours to tune** — themes, type, sounds, caret, and saved presets.
- Link: `Read the field notes →` to `/about`.

The band sits below the test card, so the typing surface remains above the fold. It uses existing
tokens and card styles; no new dependencies.

### About (`/about`)

A lazy-loaded route using the existing layout and design tokens:

- `About the lab.` heading and one-paragraph summary.
- Numbered sections:
  1. **What it measures** — net/raw WPM, accuracy, consistency, character counts.
  2. **How a run is scored** — plain-language formulas, scoring version, and why degenerate runs
     are excluded from personal bests.
  3. **Where your data lives** — `localStorage` settings, IndexedDB history, JSON/CSV export,
     clearing site data deletes it.
  4. **Typing and corrections** — free/strict/no-backspace policies, backspace behaviour, shortcuts.
  5. **What it does not do** — no accounts, cloud sync, leaderboards, server-validated shares, or
     tracking.
- Link back to the test.

### Navigation and footer

- Keep the header at Test / History / Settings. A fourth item would crowd the phone layout.
- Add `About` to the footer next to the local-first line.
- Replace `Phase 1 / local build` with `Local-first / v1`.

### Metadata and social image

- Add Open Graph and Twitter tags to `index.html`: title, description, type, URL, image, image
  dimensions, and `summary_large_image`.
- Add `public/og.png`, 1200×630, using the existing brand: paper background, display heading,
  short line, and the accent mark. Generate it once from an HTML card with Playwright so it stays
  reproducible.
- All routes share the same card. Per-route cards and dynamic titles for crawlers are out of scope.

## Testing

- Unit: About page renders its heading, sections, and back link; route table includes `/about`.
- E2E: footer and home-band links reach `/about`; the page is readable and links back.
- Accessibility: extend the axe smoke test to `/about`.
- Regression: existing above-the-fold phone test and bundle budget still pass.
- Metadata: check the built `dist/index.html` contains the OG/Twitter tags and that `og.png` is
  1200×630.

## Risks

- The band adds page height but not initial JavaScript; it is plain markup.
- The About route is lazy-loaded, so it should add only a small chunk and no entry-bundle weight.
- Social crawlers that ignore JavaScript will show the static site card for every route, including
  shared results. Acceptable for v1; document it as a limitation.

## Left to the builder

- Final copy for the band, About sections, and social card.
- Exact visual treatment of the band within the existing lab-notebook tokens.
- One-off script placement for generating `og.png` (kept out of the app bundle).
