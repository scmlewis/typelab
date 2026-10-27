# Phase 0 — Prioritised Implementation Plan (Local-Only v1)

**Status:** Approved; Phase 1 in progress  
**Rule:** No application code until this plan and the architecture are approved.

## 1. Delivery strategy

Build in independently testable slices, in this order:

1. **Foundation** — repository, tooling, CI, boundaries.
2. **Domain first** — config, prompt generation, engine, scoring, all framework-free and unit-tested.
3. **Input adapter** — the riskiest browser-facing piece, tested early in real browsers.
4. **UI and persistence** — typing surface, results, local storage, backup path.
5. **Hardening** — E2E, accessibility, performance, documentation.

There is no cloud phase. The product is complete when the local typing experience, history, analytics, themes, and export/import are polished.

## 2. Phase 0 — this phase

| Item | Status |
| --- | --- |
| Repository and toolchain audit | Done |
| Architecture proposal | Revised for local-only v1 |
| Feature checklist | Revised: cloud/social rows deferred |
| Local data model and migrations plan | Done |
| Risk register | Revised for local-only v1 |
| Implementation plan | Revised |
| Independent builder check | Done |
| Local-only scope decision recorded | Done ([ADR 0005](../decisions/0005-local-only-v1.md)) |
| Product-owner review and go-ahead | Done — approved 2026-10-27 |

**Exit gate:** approved. Hosting: Cloudflare Pages. Visual direction: “lab notebook”. Phase 1 may proceed.

## 3. Phase 1 — Functional MVP

**Goal:** a polished, local-first typing test that works anonymously, survives refresh, and has no known critical input, timer, or data-loss bug.

**Effort:** L (roughly 8–12 focused development days; AI-assisted, includes tests and review).  
**Dependencies:** Phase 0 go-ahead.

### P1.0 — Repository foundation

| Field | Detail |
| --- | --- |
| Deliverables | `git init`; Vite React TS scaffold; npm lockfile; strict `tsconfig`; path alias `@/`; Tailwind 4 + design tokens; ESLint 9 + Prettier; Vitest + RTL + Playwright; scripts (`dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:e2e`, `format`); GitHub Actions CI; `.gitignore`; `.env.example` stating that no environment variables are required; ADRs 0001–0005; README setup |
| Depends on | Nothing |
| Tests | CI runs typecheck, lint, unit tests, and build on a clean install |
| Acceptance | `npm ci && npm run typecheck && npm run lint && npm run test && npm run build` passes |
| Notes | No deploy job until the host is chosen. Do not commit secrets or real data. |

### P1.1 — Domain types, configuration, and category keys

| Field | Detail |
| --- | --- |
| Deliverables | `engine/types.ts`; Zod `TestConfig` schema; defaults; `scoringVersion`; `generatorVersion`; category-key builder; validation errors |
| Depends on | P1.0 |
| Tests | Valid/invalid configs; defaults; mode-specific required fields; category-key stability |
| Acceptance | Invalid configs are rejected at the boundary; a config is fully serialisable and round-trips |

### P1.2 — Word lists and seeded prompt generation

| Field | Detail |
| --- | --- |
| Deliverables | English 200 and English 1k lists with provenance; content validation script; seeded PRNG; punctuation and numbers transforms; deterministic `prompt.id`; generator interface for quotes/custom text |
| Depends on | P1.1 |
| Tests | Same seed + config → identical prompt; different seed → different prompt; word counts; punctuation/numbers rules; no whitespace inside words; no empty prompts |
| Acceptance | Prompt generation is pure, deterministic, and fast enough for restart (<10 ms for 100 words) |

### P1.3 — Typing engine state machine

| Field | Detail |
| --- | --- |
| Deliverables | `Clock` interface + production/fake clocks; `TypingEngine` class; `insertText`, `backspace`, `tick`, `cancel`, `reset`; typed-state model; word advancement; completion/failure rules; terminal result freeze |
| Depends on | P1.1, P1.2 |
| Tests | Every transition in the state table; first-character start; timed and word completion; strict failure; no-backspace; restart; no input after terminal; monotonic elapsed; stale-state isolation |
| Acceptance | Engine has zero React/storage imports; all transition tests pass; no timer or listener leaks in tests |

### P1.4 — Versioned scoring module

| Field | Detail |
| --- | --- |
| Deliverables | `scoring/` with net/raw WPM, accuracy, character stats, consistency, bounded interval samples, result flags, `buildResult()`; `scoringVersion = 1.0.0` |
| Depends on | P1.3 |
| Tests | Hand-computed fixtures for corrected mistakes, skipped words, extra chars, missed chars, separators, no input, <1 s, zero elapsed, partial intervals, <2 buckets; sample series length/cap; flag assignment; live stats and final stats agree |
| Acceptance | No `NaN`/`Infinity` is possible; formulas match the architecture document; every persisted result carries the version |

### P1.5 — Browser input adapter

| Field | Detail |
| --- | --- |
| Deliverables | Hidden focusable textarea; `input`/`beforeinput`/`composition` handling; backspace dedupe; space/backspace scroll prevention; shortcut filtering; focus recovery; paste rejection; mobile keyboard opening; unsupported-input messaging |
| Depends on | P1.3 |
| Tests | Unit tests for normalisation; Playwright desktop typing; composition via CDP or simulated events; mobile emulation; focus-loss recovery; rapid input stress |
| Acceptance | One physical event produces one engine input; no dropped/duplicated characters; IME composition commits once; manual iOS/Android check recorded |
| Risk | Highest-risk task; schedule early and verify in real browsers before polishing UI |

### P1.6 — Engine store and React bindings

| Field | Detail |
| --- | --- |
| Deliverables | External store with subscribe/getSnapshot; selector hook; rAF ticker; ~10 Hz stats quantisation; cleanup on unmount/restart |
| Depends on | P1.3, P1.4 |
| Tests | Subscription add/remove; selector isolation; ticker cleanup; no renders after unmount; timed completion when rAF is throttled |
| Acceptance | A keystroke updates only the active word and stats region, not the whole route |

### P1.7 — Typing UI and basic themes

| Field | Detail |
| --- | --- |
| Deliverables | App shell; config bar (mode, duration/words, language, punctuation, numbers); test surface; caret; live stats; restart; focus overlay; keyboard shortcuts; light/dark themes with tokens; responsive layout |
| Depends on | P1.5, P1.6 |
| Tests | RTL for controls and state; Playwright Journey A; keyboard navigation; reduced-motion behaviour; contrast check |
| Acceptance | User can open the page and type immediately; all controls work by keyboard; layout works at 360 px, 768 px, and 1280 px |

### P1.8 — Results screen and refresh recovery

| Field | Detail |
| --- | --- |
| Deliverables | `/results/:id`; net/raw WPM, accuracy, duration/word count, character stats, consistency, config, timestamp; new-best comparison; restart/back; missing-result state; persistence before navigation |
| Depends on | P1.4, P1.9 |
| Tests | Result rendering; refresh recovery; direct deep link; missing result; no-input result; strict-failure result |
| Acceptance | Results survive refresh; no result is shown with undefined/NaN fields; deep links work on the chosen host |

### P1.9 — Local persistence and storage safety

| Field | Detail |
| --- | --- |
| Deliverables | `SettingsRepository` + localStorage implementation; `ResultRepository` + Dexie implementation; versioned settings schema + migration/reset path; storage of terminal results with flags and samples; history query for personal bests; `navigator.storage.persist()` request; quota/write-error handling; last-export date |
| Depends on | P1.1, P1.4 |
| Tests | Fake IndexedDB; settings migration; invalid stored data; save/read/list/delete; flags/samples round-trip; degenerate rows excluded from PBs; simulated quota failure; blocked storage; no history loss on settings change |
| Acceptance | Settings and results survive refresh; corrupt data produces a recoverable error, not a crash; a failed write is visible and exportable |

### P1.10 — Quality gates and Phase 1 exit

| Field | Detail |
| --- | --- |
| Deliverables | E2E: timed test, word-count test, backspace correction, restart before completion, timer boundary, refresh recovery; axe accessibility smoke; bundle visualizer; engine benchmark; docs updated (setup, scoring, input policy, local data/backup, known limitations) |
| Depends on | P1.7, P1.8, P1.9 |
| Tests | All unit/integration/E2E suites; production build; preview deploy |
| Acceptance | Core unit tests pass; the required core journeys pass in a real browser; no known critical input, timer, or data-loss bug; p95 interaction <100 ms on the representative desktop; initial bundle within provisional budget |
| Exit report | What was implemented, what was tested, observed results, known limitations, manual verification outstanding |

### Required end-to-end journeys (v1)

| # | Journey | Phase 1 | Phase 2 |
| --- | --- | --- | --- |
| 1 | Complete a timed test | ✓ | |
| 2 | Complete a word-count test | ✓ | |
| 3 | Correct an error using backspace | ✓ | |
| 4 | Restart before completion | ✓ | |
| 5 | Complete a test at the timer boundary | ✓ | |
| 6 | Refresh and recover local settings and history | ✓ | |
| 7 | Export history and re-import it without duplicates | | ✓ |
| 8 | Import invalid/oversized data and receive a safe error | | ✓ |
| 9 | Verify responsive layouts and keyboard navigation | ✓ | |
| 10 | Verify data survives reload and a simulated storage failure is reported | Reload | Storage failure |
| 11 | Copy/share a result without exposing private custom text | | ✓ |
| 12 | Complete a quote/custom-text test and recover it from history | | ✓ |

The original spec's account, sync, and cross-user journeys are deferred with the cloud scope.

### Phase 1 critical path

```text
P1.0 → P1.1 → P1.2 → P1.3 → P1.4 → P1.6 → P1.7 → P1.8 → P1.10
                         └→ P1.5 ────────┘
                         └→ P1.9 ────────┘
```

P1.5 (input) and P1.9 (persistence) can run in parallel with P1.6/P1.7 once P1.3/P1.4 land. P1.2 content work (word-list review) can start as soon as P1.1 defines the format.

### Proposed Phase 1 commit sequence

1. `chore: scaffold Vite React TS app with strict tooling and CI`
2. `feat(engine): add serialisable test config and category keys`
3. `feat(engine): add seeded English prompt generator`
4. `feat(engine): implement typing state machine with monotonic clock`
5. `feat(engine): add versioned scoring and edge-case tests`
6. `feat(input): add hidden-input adapter with composition support`
7. `feat(typing): add test surface, live stats, and config controls`
8. `feat(results): add result screen and local history persistence`
9. `test(e2e): cover core typing journeys and refresh recovery`
10. `docs: document scoring, input policy, and local setup`

Each commit must pass typecheck, lint, and unit tests. E2E runs in CI on every pull request.

## 4. Phase 2 — Advanced typing, analytics, and backup

**Goal:** the full local feature set: more content, deep personalisation, detailed analytics, and trustworthy export/import.  
**Effort:** L (roughly 6–9 days).  
**Dependencies:** Phase 1 exit.

| Work package | Deliverables | Key tests |
| --- | --- | --- |
| P2.1 Quote mode | Quote packs, attribution, selection, quote config | Deterministic selection; missing quote handling; attribution display |
| P2.2 Custom text | Normalisation, validation, length limits, privacy | Whitespace/punctuation preserved; empty/oversized rejected; custom text excluded from shares |
| P2.3 Languages and presets | Additional language packs, vocabulary sizes, saved presets | Pack loading/lazy loading; invalid pack rejected; preset round-trip |
| P2.4 Full settings | Themes/palette editor, fonts, width, caret, sounds, live stats visibility, error highlighting, shortcuts, defaults, reduced motion, reset | Schema validation; migration; persistence; sound opt-in; reduced-motion |
| P2.5 Backup import/export | JSON backup with preview/merge; CSV export; oversized/invalid file handling; settings-only import | Round-trip; duplicate merge; invalid row; future schema; no partial apply |
| P2.6 Detailed results | Speed and raw-speed charts, character statistics, consistency explanation, test config | Chart data matches samples/scoring; accessible chart summary; no NaN |
| P2.7 History and analytics | History page, filters, trends, personal bests, pagination, storage usage, retention controls | Filters; pagination; large-history performance; no silent pruning |
| P2.8 Sharing | Copy text summary, download image card, optional encoded URL with size cap; custom text excluded | Share privacy; escaped output; URL length cap; fallback when too large |
| P2.9 Mode regression matrix | Tests across all modes and modifiers | Every supported config has at least one completion test |
| P2.10 Phase 2 exit | Regression suite, accessibility/contrast audit, docs, backup guidance | No mode-specific regressions; a user can move data between browsers |

**Exit criteria:** configuration changes behave consistently; historical results retain explicit scoring versions; backup/restore works; regression tests cover all supported modes.

## 5. Deferred cloud and social scope

The following original P1/P2 items are **not in v1** and are not estimated:

- Accounts, registration, login, logout, password reset.
- Cloud settings or history sync.
- Public profiles, personal bests across devices.
- Server-validated leaderboards.
- Server-hosted share links with stable short URLs.
- Real-time multiplayer.

The local data model keeps `clientTestId` and repository interfaces so a future sync layer is possible, but no cloud code, schema, or dependency ships in v1. See [ADR 0005](../decisions/0005-local-only-v1.md).

## 6. Phase 3 — Optional local advanced modes

Only after Phase 2 is stable. Each item needs its own design and approval.

| Item | Notes |
| --- | --- |
| Custom word-list management | Import/validate/store local word lists; no server |
| Challenge links | Encode config + seed in the URL; no server state |
| Daily challenges | Deterministic daily seed; local completion tracking |
| Keyboard-layout visualisation | Layout metadata; practice mode; accessibility implications |
| Personalised weak-character analysis | Derived from local attempt data; privacy-friendly |
| Additional modifiers | Stop-on-word, stop-on-letter, zen mode; scoring-version implications |
| Installable PWA | Optional service worker; offline shell; careful cache versioning |
| Multiplayer | Not planned; would require a separate server design and is out of scope |

## 7. Dependencies and parallelisation

| Can run in parallel | Cannot start until |
| --- | --- |
| Design tokens/UI shell + engine work | Config schema and engine API sketch |
| Word-list review + engine/scoring | P1.1 format |
| Input adapter + store/UI | Engine input API |
| Persistence + UI | Result type and repository interfaces |
| E2E harness + UI | Stable route and data-testid conventions |
| Backup/share work + history UI | Result schema and samples |

## 8. Review gates

| Gate | When | What is reviewed |
| --- | --- | --- |
| **A. Phase 0 go-ahead** | Now | Local-only scope, architecture, hosting, visual direction, Phase 1 plan |
| **B. Phase 1 exit** | After P1.10 | Demo, test report, known limitations, bundle/perf measurements |
| **C. Phase 2 exit** | After P2.10 | Mode/config matrix, analytics, backup/restore, sharing privacy, accessibility |
| **D. Optional advanced modes** | Before Phase 3 | Value vs complexity, one design per feature |

## 9. Decisions required before Phase 1 starts

| # | Decision | Chosen | Status |
| --- | --- | --- | --- |
| 1 | Hosting target | Cloudflare Pages | Decided |
| 2 | Visual direction | “Lab notebook” (warm paper / ink, mono test surface) | Decided |
| 3 | Package manager | npm | Decided |
| 4 | Share format | Text + image first; encoded URL optional | Decided |
| 5 | PWA | Defer; no service worker in Phase 1 | Decided |

## 10. First actions after go-ahead

1. Initialise git and scaffold the Vite React TS project (P1.0).
2. Add strict tooling, CI, and ADRs 0001–0005.
3. Implement config + prompt generator + engine + scoring with tests before any UI.
4. Build the input adapter and verify it in Chrome, Firefox, and Safari.
5. Build the typing surface and results screen.
6. Add local persistence, storage-safety handling, and the export path.
7. Run the Phase 1 exit checklist and report actual test output.

No cloud account, paid service, or production change will be created. There is no backend to deploy.
