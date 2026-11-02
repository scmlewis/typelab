# TypeLab v1 close-out — design

Status: proposed, awaiting approval.

## Intent

Finish the remaining Phase 2 work without widening the product beyond local-only v1. The close-out
adds two content languages, a curated accent palette, storage visibility with manual cleanup, and a
quality pass that makes older history reachable and corrects the project record.

The work is split into three sequential slices:

1. Storage, history, and quality close-out.
2. Spanish and French content packs.
3. Curated accent palettes.

Each slice lands on `main` with its own plan, tests, CI run, deploy, and production check before the
next begins. The order keeps the schemas stable while content risk is handled, then adds the one
settings migration at the end.

## Goals

- Show how many runs are stored, how much space they roughly use, and how many are older than
  90 days.
- Let people delete runs older than 90 days or delete all runs, each behind an explicit two-step
  confirmation and an export reminder.
- Let history load older runs instead of stopping permanently at the most recent 100.
- Add Spanish and French word lists (top 200 and top 1,000) and language-matched public-domain
  quotes.
- Keep every existing English result, backup, preset, and share link valid.
- Add four contrast-validated accents (Rust, Moss, Indigo, Plum) with light and dark variants.
- Apply the saved accent before first paint, with no flash.
- Correct stale Phase 2 checklist entries and close the phase with a written exit report and a mode
  regression matrix.
- Fold in the small review items: extra social metadata, a static OG PNG dimension assertion, a
  375×667 above-the-fold test, accurate “no server” copy, a sibling field-notes section, one eyebrow
  treatment, and a route-table test.

## Non-goals

- Translating the interface. The language selector changes test words and quotes only; every label,
  message, and page remains in English.
- Free colour picking, per-user hex entry, or automatic contrast fallback.
- Automatic retention or background pruning. Deletion only happens when a person asks for it.
- Changing scoring, personal-best comparability, or the share snapshot format.
- Custom word lists, challenge links, accounts, sync, leaderboards, or server-hosted shares.
- Recolouring the generated share card. It stays on the TypeLab rust brand.
- A slow real-time E2E completion test for every mode. The mode matrix records which modes are
  covered automatically and which remain manual.

## Anti-goals

- A language switch that silently keeps generating English words or an English quote.
- A settings migration that drops a preset, appearance choice, or saved result.
- An accent that fails 4.5:1 for small text or makes muted text unreadable on an accent-soft
  background.
- A delete action that runs from one click, has no export reminder, or also removes settings.
- A history “load more” that duplicates rows, skips rows after a deletion, or draws an unbounded
  chart.
- Burning the bundle budget with content only some visitors use.

## Constraints

- Static React SPA on Cloudflare Pages under a strict CSP. No inline scripts, no backend.
- Settings live in `localStorage`; history lives in IndexedDB through Dexie.
- Settings schema is currently v5. Accents need v6 with a one-step migration from v5.
- The backup shape is version 1. New enum values are additive, so the backup version stays 1; an
  older build will reject rows in a language it does not know, which is the existing invalid-row
  behaviour.
- Share snapshots already store `language` as a string, so no share-format change is needed.
- Existing quote ids are stable and are part of personal-best category keys. English ids must not
  change.
- Word lists come from `hermitdave/FrequencyWords` (MIT), files
  `content/2018/es/es_50k.txt` and `content/2018/fr/fr_50k.txt`.
- Current bundle headroom: entry JS 133.5 kB of 160 kB, all JS 277.4 kB of 340 kB, CSS 6.5 kB of
  16 kB gzip.

## Approaches considered

1. **Three sequential slices on `main` (chosen).** Storage/quality first, languages second, accents
   third. Each slice is independently reviewable, deployable, and reversible. Shared files
   (`settings.ts`, `config.ts`, `TestToolbar`, docs) change once per slice, so conflicts stay small
   and a regression can be attributed to one slice.
2. **Three parallel branches, merged at the end.** Faster calendar time, but the same schema,
   toolbar, and settings files change in all three branches. With native execution there is no
   wall-clock gain, and the merge would be the riskiest part of the work.
3. **One combined plan and release.** Fewer reviews, but one large diff mixing content QA, a schema
   migration, storage deletion, and visual tokens. Harder to verify and harder to roll back.

Within slice 1, storage controls could live on a separate `/data` page. They belong in Settings:
that page already owns destructive reset, backups, and local-only copy, and adding a fourth header
item would crowd the 375 px layout.

Within slice 3, accents could be a free colour picker. A curated set is chosen instead: every pair
can be contrast-tested, the palette stays coherent with the lab-notebook design, and there is no
“invalid colour” state to explain.

## What gets built

### Slice 1 — storage, history, and quality

#### History pagination

`HistoryPage` currently requests 100 rows and tells the reader that older runs exist but cannot be
reached. Replace the one-shot page state with an accumulated list:

- Initial request: `limit: 100`, `offset: 0`.
- “Load more” requests the next 100 with `offset` equal to the number of loaded rows.
- Merge by result id so a retry or a concurrent save cannot duplicate a row.
- Reset the list when the mode, language, or excluded-run filter changes.
- After a single-row delete, remove that row from the loaded list, decrement the total, and leave
  the remaining rows in place.
- Show “Showing N of M runs” and a Load more button while `hasMore` is true.
- The trend chart draws at most the newest 200 loaded runs. When more are loaded, the page says the
  chart covers the latest 200.

Offset pagination is acceptable for v1 with a single active tab. The repository already supports
`offset`. Deduplication by id covers the ordinary race where a save lands between requests.

#### Storage summary and cleanup

Extend `LocalResultRepository` with:

- `getStorageSummary(now?: Date): Promise<StorageSummary>` where `StorageSummary` contains:
  - `count` — all saved runs, including failed and excluded runs.
  - `bytes` — an estimate from the UTF-8 length of each row’s JSON, summed with a Dexie cursor.
  - `oldestCompletedAt` / `newestCompletedAt` — ISO strings or null.
  - `olderThan90Days` — count before the 90-day cutoff, using the same `now` passed in.
- `deleteOlderThan(cutoffIso: string): Promise<number>` — counts and deletes matching rows in one
  read-write transaction and returns the number removed.
- `deleteAll(): Promise<number>` — counts and clears the results table, returning the number
  removed. The `meta` table is left intact.

The estimate intentionally measures TypeLab payload, not the whole origin quota. The UI calls it
an estimate and does not claim to know browser overhead.

Add `StoragePanel` under `src/features/history/`, rendered in Settings after Presets and before the
backup panel:

- Summary line: run count, estimated size, oldest run date, and how many runs are older than
  90 days (including “none are older than 90 days”).
- Copy: deletion cannot be undone, removes history only, and can change personal bests and trends.
- “Export a backup first” anchor to the backup panel.
- “Delete older than 90 days” and “Delete all runs” buttons.
- Each button uses the existing two-step inline confirmation pattern. The confirmation names the
  number of runs that would be removed. Cancel resets it.
- While a deletion runs, both buttons are disabled and a status message is announced.
- After success, re-read the summary and announce “Deleted N runs.”
- If no runs are older than 90 days, the older-than button is disabled with a short explanation.
- The panel is a client of the repository, accepts an injected repository for tests, and never
  touches settings or presets.

The backup panel gets `id="backup"` and scroll margin so the export reminder lands on it.

#### Quality close-out

- Correct `PROJECT_CHECKLIST.md`: live stats/error highlighting/quick restart, personal bests per
  category, and pagination are already implemented or completed by this slice.
- Create `docs/phase-2-exit.md` as a living close-out document, not a finished report. Slice 1
  records storage/history evidence and the mode matrix skeleton: timed, words, quote, custom; free,
  strict, no-backspace; light/dark; desktop/phone; Chromium/Firefox/WebKit. Each cell says
  automated, manual, or not covered. Existing E2E coverage is referenced rather than duplicated.
- Update `docs/product-spec.md`, `docs/launch-readiness.md`, `README.md`, and
  `docs/third-party-notices.md` for the behaviour that exists after slice 1. Later slices amend
  the same documents as their features land.
- After slice 3, make a final docs pass: fill in the mode matrix with language and accent rows,
  record final test and bundle numbers, list the manual Spanish/French keyboard checks, and only
  then mark the Phase 2 exit report complete in `PROJECT_CHECKLIST.md`.
- Add the deferred review items:
  - `og:site_name`, `og:locale`, `og:image:type`, and `twitter:image:alt` in `index.html`.
  - A unit test that reads `public/og.png` and asserts the PNG signature and 1200×630 IHDR size.
  - A 375×667 version of the above-the-fold test alongside the existing 390×664 check.
  - Replace “no server” with accurate wording: no account and no application server; the app is
    static files.
  - Make the field-notes band a sibling section of the bench rather than a nested section.
  - Introduce one small `Eyebrow` component and use it for page labels so casing, tracking, and
    accent colour stop drifting.
  - A route-table test that renders every declared route, including the not-found fallback.

### Slice 2 — Spanish and French content packs

#### Types and content registry

Expand the enums additively:

```ts
type Language = 'english' | 'spanish' | 'french';
type Vocabulary =
  | 'english-200' | 'english-1k'
  | 'spanish-200' | 'spanish-1k'
  | 'french-200' | 'french-1k';
```

Add `src/engine/content/languages.ts` with ordered language options and helpers:

- `LANGUAGE_OPTIONS` — value, English label, vocabulary tier values.
- `languageForVocabulary(vocabulary)` and `vocabularyForLanguage(language, tier)`.
- `vocabularyTier(vocabulary)` and a display label helper.

The vocabulary prefix must match the language. Do not refine the shared base config schema,
because the mode schemas are built with `.extend()`. Instead:

- Add `normalizeVocabulary(language, vocabulary)` which keeps the requested tier and rewrites the
  prefix (for example `spanish` + `english-1k` becomes `spanish-1k`).
- Use it in `configFromDefaults`, `toTestConfig`, the toolbar change handlers, and the settings
  load path. A hand-edited or old settings payload with a mismatched pair is repaired to the
  requested language and tier rather than silently generating English words under a Spanish label.
- Apply a top-level refinement to the final `testConfigSchema` discriminated union, after the mode
  schemas are combined, so imported backups and encoded configs reject mismatched pairs instead of
  accepting an impossible combination. This does not interfere with `.extend()` on the base.
- Keep `testDefaultsSchema` unrefined so a bad stored pair can be repaired without resetting every
  setting; the repository normalises after migration.
- Cover mismatched-pair repair and import rejection in unit tests.

#### Word lists

Add `spanish-200.ts`, `spanish-1k.ts`, `french-200.ts`, and `french-1k.ts`, generated from the
FrequencyWords files:

- Normalise to NFC, lowercase.
- Keep words of 2–20 letters, including the language’s accented letters. Reject digits,
  apostrophes, hyphens, spaces, and abbreviations with punctuation.
- Deduplicate case-insensitively, preserving frequency order.
- Take the first 1,000; the 200 list is the first 200 entries of that list.
- Spot-check for proper nouns, fragments, and offensive entries; drop obvious non-words.
- Keep the source URL and MIT attribution in the file header and in
  `docs/third-party-notices.md`.

Add a small `scripts/build-language-lists.mjs` that fetches the pinned source files and prints the
TypeLab arrays. It is a maintenance tool, not part of the build or CI. Generated lists are
committed so CI and production never need network access.

The lists join `WORD_LISTS` with the existing English entries. `getWordList` keeps its current
signature.

#### Quotes

Add `language: Language` to `Quote`; label every existing English quote `english`. Add six Spanish
and six French public-domain excerpts with stable, language-prefixed ids (for example
`cervantes-quijote-01`, `hugo-miserables-01`). Keep author and source visible.

Keep native punctuation and accents in the Spanish and French quotes; a standard keyboard for that
language can type them. Do not introduce characters outside the language keyboard where a simpler
mark works.

Change quote selection to filter by language:

```ts
pickQuote(seed: number, language: Language, excludeId?: string): Quote;
```

Throw when a language has no quotes. `getQuoteById` and `formatQuoteAttribution` keep their
signatures. Existing English ids remain valid, so old results, personal-best keys, and share links
continue to resolve.

`TypingTest` updates its quote repair and refresh paths:

- A quote config whose quote id is unknown or belongs to another language is repaired by picking a
  quote in `config.language`.
- A fresh seed in quote mode picks within the active language and still avoids repeating the
  current quote.
- Switching language while in quote mode picks a new quote in that language.
- Switching language in timed/words mode preserves the tier: `english-1k` becomes `spanish-1k`.

#### Settings and UI

- Settings schema stays at v5 for this slice. Existing English values remain valid and no migration
  is needed.
- `DEFAULT_SETTINGS` stays English / top 200.
- Test defaults gain a language control. The word-list control shows only the active language’s two
  tiers and displays “Top 200” / “Top 1,000”; the language label carries the language name.
- The bench toolbar gains a language select for timed, words, and quote modes. The word-list select
  stays for timed/words. Changing language rewrites the vocabulary value and, in quote mode, picks a
  new quote.
- Custom text carries the active language and vocabulary for record-keeping but does not show
  language controls; the custom text itself is unchanged.
- History gains a language filter: All languages / English / Spanish / French, alongside the mode
  filter.
- Formatting helpers show “English 200”, “Spanish 1k”, “French 200”, and so on. `formatLanguage`
  maps enum values to display labels instead of capitalising the raw value.
- The interface remains English. Add one line of copy near the selector: “Changes the words and
  quotes, not the interface.”

#### Compatibility and limits

- `resultSchema` and the config schema accept the expanded enums. Existing rows still parse.
- Backups keep schema version 1. A backup containing Spanish or French rows cannot be imported by a
  pre-language build; it will report invalid rows. This is documented in the exit report.
- Share links already carry a language string and remain readable.
- Accented input relies on the operating system’s keyboard layout or input method. No ASCII fallback
  is applied. Dead-key composition must be verified on Spanish and French layouts and documented as
  a manual check.
- Spanish inverted question/exclamation marks and French spacing before `?`/`!` are not synthesised
  by the punctuation modifier in v1. The modifier uses the existing ASCII marks. This is a stated
  limitation.
- If the added lists push the bundle past budget, they are already frequency-ordered and gzip well;
  reduce decorative content before cutting the top 1,000 tiers.

### Slice 3 — curated accent palettes

#### Palette

Four accents, each with a light and dark pair. `tokens.css` remains the source of truth.

| Accent | Light accent | Light soft | Dark accent | Dark soft |
| ------ | ------------ | ---------- | ----------- | --------- |
| Rust   | `#a8451f`    | `#ead6c8`  | `#e07a4f`   | `#3a2a23` |
| Moss   | `#5a6b2f`    | `#e4e7cf`  | `#c3d18a`   | `#2f3520` |
| Indigo | `#3b4f9e`    | `#dbe1f4`  | `#a9b8ff`   | `#252b45` |
| Plum   | `#7a336b`    | `#ecd7e7`  | `#e3a1d4`   | `#3a2435` |

Rust remains the default and keeps the already-audited light accent. All values above clear
4.5:1 for accent text on both paper and surface, and for ink on accent-soft, in their theme. Moss is
deliberately distinct from the success token. The test calculates the ratios rather than trusting
the table.

Accent-soft backgrounds that currently carry `text-ink-muted` (history flags and similar badges)
switch to `text-ink`. At 70% opacity over paper, muted text can sit at the edge of 4.5:1; ink is
comfortably clear.

#### Settings and application

- Settings schema v6 adds `appearance.accent` with values `rust | moss | indigo | plum`, default
  `rust`.
- Add a v5 → v6 migration that preserves test defaults, appearance, and presets and adds the
  default accent. Update the v1–v4 migration outputs so they all produce a complete v6 object.
- `index.html` starts with `data-accent="rust"`. `:root` already defines the rust pair, so the
  default needs no JavaScript.
- `boot.js` reads `appearance.accent`, validates it against the four names, and sets
  `document.documentElement.dataset.accent` before first paint. Invalid or missing values fall back
  to rust.
- Add `useAccent(preference)` beside `useTheme` and `useMotion`, and call it from `ThemedRoutes`.
  It sets the dataset whenever the saved choice changes.
- Add an Accent group to the Appearance settings card: four labelled swatch buttons with
  `aria-pressed`. Each swatch sets its own `data-accent`. The token selectors apply to any element
  carrying `data-accent`, and dark values match both `[data-theme='dark'] [data-accent='…']` and
  `[data-theme='dark'][data-accent='…']`, so a nested swatch previews the variant for the current
  theme. The active swatch is indicated by a ring and `aria-pressed`, not colour alone.
- The selected accent applies immediately (context update), survives reload, and is carried in
  settings backups through the normal `appearance` object.

#### Contrast and visual checks

- Add a unit test that reads `src/styles/tokens.css`, extracts each accent block, and asserts:
  - light accent vs paper and surface ≥ 4.5:1;
  - dark accent vs paper and surface ≥ 4.5:1;
  - accent-soft vs ink ≥ 4.5:1 in both themes.
- Extend the axe smoke test to the Settings appearance section and rerun it for at least one
  non-default accent in light and dark.
- Add an E2E test: choose Moss, reload, assert `data-accent="moss"` before/at app render, and assert
  the bench still renders correctly.
- Share cards, OG images, favicons, and browser chrome keep their fixed brand colours. The palette
  changes in-app chrome only.

## Testing

Each slice runs the full local gate: typecheck, lint, Prettier check, unit tests, build, bundle
budget, and all three Playwright projects.

Slice 1:

- Repository cursor summary, 90-day cutoff, delete counts, delete-all leaving meta, and empty
  history.
- Storage panel summary, two-step confirmations, disabled older-than state, error handling, and
  summary refresh.
- History pagination merge, filter reset, delete-with-more-remaining, and chart cap.
- Route-table test, OG metadata test, OG PNG dimensions, 375×667 above-the-fold test.
- Accessibility smoke still passes on every route.

Slice 2:

- Word-list integrity: counts, uniqueness, length, lowercase, allowed characters, top-200 subset,
  and no whitespace.
- Config encode/decode for every new language/vocabulary pair.
- Mismatched language/vocabulary repair in settings and config construction, and rejection when
  importing an impossible pair.
- Settings defaults and presets round-trip.
- Quote language filtering, stable English ids, language repair, and no-repeat behaviour.
- Toolbar and settings selectors preserve tier and pick the right quote.
- History language filter and formatting labels.
- Backup round-trip for each language; old English backup still imports.
- E2E: switch to Spanish, complete a short words run, and see Spanish words and history label;
  switch to French in quote mode and see a French quote and source.
- Accessibility and bundle budget.

Slice 3:

- Settings v5 → v6 migration preserving every field; v1–v4 migrations still valid.
- Invalid accent falls back to rust; boot and runtime application agree.
- Palette contrast test for all four accents in both themes.
- Settings swatch interaction, active-state accessibility, current-theme preview colours,
  persistence, and reset.
- E2E accent persistence across reload and axe checks in light and dark.
- Bundle and accessibility budget.

## Rollout

- Ship sequentially to `main`; CI gates each push and Cloudflare Pages deploys after CI succeeds.
- After each deploy, smoke the live site: home, settings, history, a completed run, and any surface
  changed by that slice.
- If a slice regresses, revert that slice’s commit range. Earlier slices stay usable.
- Slice 3 is the only settings-schema change; it must not ship until the v5 migration tests pass.
- The Phase 2 exit report is only marked complete after the final docs pass that follows slice 3.

## Risks

- **Frequency-list quality.** Frequency corpora include names, fragments, and unwanted words.
  Filtering plus a manual spot-check is required; the exit report records what was checked.
- **Accented input.** Some layouts need dead keys or an input method. The engine already defers IME
  composition, but actual Spanish/French layout testing is manual and listed as outstanding if not
  performed.
- **Bundle growth.** Two 1,000-word lists plus quotes add content to the entry chunk. Gzip
  compresses word lists well; the bundle gate is the backstop.
- **Deletion is irreversible.** Two-step confirmation, explicit counts, and an export reminder are
  the safeguards. There is no undo.
- **Cross-tab history.** Another open tab will not see a bulk deletion until it refreshes. This is a
  documented v1 limitation, consistent with the existing per-row delete.
- **Offset pagination.** A concurrent save can shift offsets. Deduplication by id prevents visible
  duplicates; a skipped row is possible until refresh. Acceptable for a single-user local app.
- **Accent-soft opacity.** Badges use partial opacity. The fix is to require ink on accent-soft and
  test the token pair, not to rely on a specific alpha blend.

## Left to the builder

- The exact source commit for FrequencyWords and the generated list contents after filtering.
- The final Spanish/French quote excerpts, authors, sources, and ids.
- Final storage-panel and language-selector copy within the described behaviour.
- The exact chart cap if 200 proves heavy on low-end devices.
- Whether the route-table test extracts route data or renders each path; either is acceptable if
  every declared route is covered.
- Final eyebrow wording while keeping one shared component and treatment.
- Palette swatch layout within the existing Appearance card.
