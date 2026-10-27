# Phase 0 — Feature Checklist (Local-Only v1)

Status values: **Planned**, **In progress**, **Done**, **Deferred**.  
Nothing in this checklist is implemented yet. Cloud/social rows are retained for traceability but are **not in v1 scope**.

## P0 — Core functionality (Phase 1)

| ID | Requirement | Acceptance signal | Status |
| --- | --- | --- | --- |
| P0-01 | Typing engine state machine | `idle/running/completed/failed/cancelled` transitions covered by unit tests | Planned |
| P0-02 | Keyboard input without a visible always-focused field | User can type immediately; hidden input handles focus, mobile keyboard, and focus loss | Planned |
| P0-03 | Letters, numbers, punctuation, spaces, backspace | Character-level feedback matches target; backspace corrections work | Planned |
| P0-04 | Ignore unrelated shortcuts; prevent page scroll on space | Ctrl/Cmd shortcuts do not insert characters; space/backspace do not scroll/navigate | Planned |
| P0-05 | Repeated keys, rapid input, focus loss | Stress test and Playwright run produce no dropped/duplicated characters | Planned |
| P0-06 | Monotonic clock | Timer uses `performance.now()` via injected clock; no wall-clock jumps | Planned |
| P0-07 | Timed modes 15/30/60/120 s | Configurable; completes at the boundary | Planned |
| P0-08 | Word modes 10/25/50/100 words | Configurable; completes on final character | Planned |
| P0-09 | English word lists, at least two sizes | `english-200` and `english-1k` (final sizes confirmed at scaffold) | Planned |
| P0-10 | Punctuation toggle | Generated prompts include punctuation; disabled by default | Planned |
| P0-11 | Numbers toggle | Generated prompts include numbers; disabled by default | Planned |
| P0-12 | Live timer, WPM, raw WPM, accuracy | Update at ~10 Hz without re-rendering the whole test | Planned |
| P0-13 | Character-level correctness feedback | Correct/incorrect/extra/missed states visible and non-colour-only | Planned |
| P0-14 | Restart | New test ID and prompt; no stale timers/listeners | Planned |
| P0-15 | Results screen | Net/raw WPM, accuracy, duration/word count, char stats, timestamp, config | Planned |
| P0-16 | Local settings persistence | Settings survive refresh and validate against a schema | Planned |
| P0-17 | Local history persistence | Completed results survive refresh; retrievable by ID | Planned |
| P0-18 | Responsive layout | Usable at mobile, tablet, desktop widths | Planned |
| P0-19 | Keyboard navigation | All controls reachable by Tab; focus visible | Planned |
| P0-20 | Basic themes | At least light and dark, contrast-checked | Planned |
| P0-21 | Unique test ID and serialisable config | Every result has a stable ID and reproducible config | Planned |
| P0-22 | Composition/IME input path | Composition events commit once; no duplicate characters | Planned |
| P0-23 | Documented unsupported input policy | README/docs state supported browsers, layouts, and limitations | Planned |
| P0-24 | Terminal result flags | `failed`, `no-input`, `under-one-second` persisted; excluded from PBs/trends by default | Planned |
| P0-25 | Bounded interval samples | Persisted in Phase 1 so Phase 2 charts need no schema migration | Planned |
| P0-26 | Storage safety | Failed writes are visible; persistent storage is requested; export path is available | Planned |
| P0-27 | Backup reminder | Last export date is visible; clearing browser data is explained | Planned |

## P1 — Local full-featured release (Phase 2)

### Typing and content

| ID | Requirement | Status |
| --- | --- | --- |
| P1-01 | Multiple language packs | Planned |
| P1-02 | Quote-based tests | Planned |
| P1-03 | Custom text mode | Planned |
| P1-04 | Configurable test presets | Planned |
| P1-05 | Advanced error-handling modes | Planned |
| P1-06 | Additional typing modifiers (e.g. stop-on-word) | Planned |
| P1-07 | Challenge links that reproduce config | Optional/Phase 3 |

### Settings and presentation

| ID | Requirement | Status |
| --- | --- | --- |
| P1-08 | Theme and custom palette | Planned |
| P1-09 | Light/dark/system appearance | Planned |
| P1-10 | Font family, size, text width | Planned |
| P1-11 | Caret style and animation | Planned |
| P1-12 | Sound effects and volume | Planned |
| P1-13 | Live statistics visibility | Planned |
| P1-14 | Error highlighting and correction behaviour | Planned |
| P1-15 | Quick-restart shortcuts | Planned |
| P1-16 | Test defaults and language | Planned |
| P1-17 | Reduced-motion preference | Planned |
| P1-18 | Settings export/import with schema validation | Planned |
| P1-19 | Settings restore-to-defaults | Planned |

### Results, history, and backup

| ID | Requirement | Status |
| --- | --- | --- |
| P1-20 | Speed-over-time chart | Planned |
| P1-21 | Optional raw-speed chart | Planned |
| P1-22 | Consistency score with definition | Planned |
| P1-23 | Correct/incorrect/extra/missed character stats | Planned |
| P1-24 | Personal-best comparison | Planned |
| P1-25 | Detailed result analysis page | Planned |
| P1-26 | History filters (date, mode, language, duration) | Planned |
| P1-27 | WPM/accuracy trend charts | Planned |
| P1-28 | Personal bests per compatible category | Planned |
| P1-29 | History pagination/incremental loading | Planned |
| P1-30 | History export JSON and CSV | Planned |
| P1-31 | Local backup import with preview/merge | Planned |
| P1-32 | No silent history loss on settings changes or pruning | Planned |
| P1-64 | Storage usage display and retention controls | Planned |
| P1-65 | Share text summary and image card without private custom text | Planned |
| P1-66 | Optional encoded URL share with size cap | Planned |
| P1-67 | Clear "local-only, no sync" product messaging | Planned |
| P1-68 | Installable PWA/offline shell | Optional/Phase 3 |

### Quality and operations

| ID | Requirement | Status |
| --- | --- | --- |
| P1-53 | Responsive accessibility audit | Planned |
| P1-54 | Theme contrast checks | Planned |
| P1-55 | Screen-reader labels for controls and charts | Planned |
| P1-56 | Reduced-motion support | Planned |
| P1-57 | Bundle budget measured and enforced | Planned |
| P1-58 | Interaction p95 <100 ms measurement | Planned |
| P1-59 | CI: typecheck, lint, unit, build, E2E | Planned |
| P1-60 | Preview and production deployments | Planned |
| P1-61 | Setup docs and "no environment variables" note | Planned |
| P1-62 | Local migration reproducibility | Planned |
| P1-63 | Data-retention and public-sharing documentation | Planned |

## Deferred — cloud and social scope (not in v1)

These rows are retained to show what was intentionally cut. They are not estimated or scheduled.

| ID | Requirement | Reason |
| --- | --- | --- |
| P1-33–P1-44 | Registration, login, password reset, profiles, cloud settings/history sync, account deletion/export | No backend in v1 |
| P1-45–P1-52 | Server-validated leaderboards, public profiles, server-hosted share links, anti-cheat documentation | Requires a server and public data model |
| P1-31 (old) | Local vs cloud record distinction | No cloud records |
| P2-08 | Real-time multiplayer | Out of scope; separate design |

## P2 — Optional local advanced modes (Phase 3)

| ID | Requirement | Status |
| --- | --- | --- |
| P2-01 | Custom word-list management | Deferred |
| P2-02 | Challenge links | Deferred |
| P2-03 | Optional daily challenges (local) | Deferred |
| P2-04 | Keyboard-layout visualisation | Deferred |
| P2-05 | Layout-aware practice | Deferred |
| P2-06 | Personalised weak-character analysis | Deferred |
| P2-07 | Additional typing modifiers/experimental modes | Deferred |

## Required end-to-end journeys

| # | Journey | Phase |
| --- | --- | --- |
| E2E-01 | Complete a timed test | 1 |
| E2E-02 | Complete a word-count test | 1 |
| E2E-03 | Correct an error using backspace | 1 |
| E2E-04 | Restart before completion | 1 |
| E2E-05 | Complete a test at the timer boundary | 1 |
| E2E-06 | Refresh and recover local settings and history | 1 |
| E2E-07 | Export history and re-import it without duplicates | 2 |
| E2E-08 | Import invalid/oversized data and receive a safe error | 2 |
| E2E-09 | Verify responsive layouts and keyboard navigation | 1 |
| E2E-10 | Verify data survives reload and a simulated storage failure is reported | 1/2 |
| E2E-11 | Copy/share a result without exposing private custom text | 2 |
| E2E-12 | Complete a quote/custom-text test and recover it from history | 2 |

## Explicit non-goals

- Accounts, cloud sync, public profiles, or server leaderboards in v1.
- Copying Monkeytype branding, logo, or proprietary assets.
- Claiming feature parity without a verified inventory.
- Trusting client-generated scores for public ranking.
- Runtime AI inference without a concrete benefit.
- Unnecessary infrastructure before a demonstrated need.
- Multiplayer before the core platform is reliable.

## Definition of done (applies to every feature)

- [ ] Requirements and edge cases documented.
- [ ] Implementation is type-safe.
- [ ] Unit and integration tests written and passing.
- [ ] Verified in a real browser.
- [ ] Loading, error, empty, offline, and storage-failure states handled.
- [ ] Accessibility and privacy implications checked.
- [ ] Docs and migrations updated.
- [ ] Change committed coherently.
- [ ] No unrelated regressions.
