# TypeLab — Project Implementation Checklist

Living checklist. Update status as work lands. A checked item means the acceptance signal was actually observed, not assumed.

## Phase 0 — Audit and design

- [x] Inspect repository and toolchain
- [x] Survey local project conventions
- [x] Architecture proposal
- [x] Feature checklist (P0/P1/P2)
- [x] Local data model and migrations plan
- [x] Risk register
- [x] Prioritised implementation plan
- [x] ADRs 0001–0005 drafted
- [x] Source specification captured in `docs/product-spec.md`
- [x] Independent builder check
- [x] Local-only v1 scope decision recorded
- [x] Product-owner go-ahead (hosting, visual direction, Phase 1 scope)

## Phase 1 — Functional MVP

### Foundation

- [x] `git init` and initial commit
- [x] Vite + React + TypeScript scaffold
- [x] Strict TypeScript settings
- [x] Tailwind 4 + design tokens
- [x] ESLint + Prettier
- [x] Vitest + React Testing Library
- [x] Playwright
- [x] GitHub Actions CI (typecheck, lint, unit, build)
- [x] `.gitignore`, `.env.example` (no env required)
- [x] README local setup
- [x] ADRs moved to Accepted

### Engine

- [x] `TestConfig` Zod schema + defaults + category key
- [x] English 200 and English 1k word lists with provenance
- [x] Seeded PRNG + prompt generator
- [x] Punctuation and numbers transforms
- [x] `Clock` interface + fake clock
- [x] Engine state machine (`idle/running/completed/failed/cancelled`)
- [x] Timed completion at the boundary
- [x] Word-count completion on the final character
- [x] Backspace and correction policy
- [x] Strict failure and no-backspace policies
- [ ] Restart without stale timers/listeners
- [x] Versioned scoring (`1.0.0`): net/raw WPM, accuracy, char stats, consistency
- [x] Bounded interval samples persisted for charts
- [x] Result flags (`no-input`, `under-one-second`, `failed`, `low-confidence`)
- [ ] Degenerate results excluded from PBs/trends by default
- [ ] Quote/custom category rules
- [x] Edge-case tests (zero elapsed, no input, partial intervals, incomplete words)

### Input and UI

- [ ] Hidden textarea input receptor
- [ ] `input`/`beforeinput` handling
- [ ] Composition/IME handling
- [ ] Backspace dedupe
- [ ] Space/backspace scroll prevention
- [ ] Shortcut filtering
- [ ] Focus-loss recovery
- [ ] Paste rejection
- [ ] Mobile keyboard path
- [ ] External store + selectors
- [ ] rAF ticker + 10 Hz stats quantisation
- [ ] Typing surface with character feedback
- [ ] Caret
- [ ] Live timer/WPM/raw/accuracy
- [ ] Config bar (mode, duration/words, language, punctuation, numbers)
- [ ] Restart
- [ ] Focus overlay
- [ ] Light/dark basic themes
- [ ] Responsive layout

### Results and persistence

- [ ] Results route `/results/:id`
- [ ] Net/raw WPM, accuracy, consistency, char stats, config, timestamp
- [ ] Personal-best comparison
- [ ] Missing-result state
- [ ] Refresh recovery
- [ ] Settings repository + localStorage
- [ ] Settings schema versioning/migration
- [ ] Result repository + Dexie
- [ ] History query for personal bests
- [ ] `navigator.storage.persist()` request
- [ ] Quota/write-error handling with export action
- [ ] Last-export date + backup reminder
- [ ] No silent history deletion

### Quality and exit

- [ ] E2E: timed test
- [ ] E2E: word-count test
- [ ] E2E: backspace correction
- [ ] E2E: restart before completion
- [ ] E2E: timer boundary
- [ ] E2E: refresh recovery
- [ ] E2E: responsive layout + keyboard navigation
- [ ] Accessibility smoke (axe)
- [ ] Reduced-motion check
- [ ] Bundle visualizer + budget check
- [ ] Engine benchmark + interaction p95
- [ ] Manual Chrome, Firefox, Safari check
- [ ] Manual iOS/Android check
- [ ] Docs: setup, scoring, input policy, local data/backup, limitations
- [ ] Phase 1 exit report

## Phase 2 — Advanced typing, analytics, and backup

- [ ] Quote mode
- [ ] Custom text mode
- [ ] Additional languages/language packs
- [ ] Saved presets
- [ ] Full settings (themes, palette, fonts, width, caret, sounds)
- [ ] Live stats visibility, error highlighting, quick restart
- [ ] Reduced-motion preference
- [ ] Settings import/export + reset
- [ ] Speed and raw-speed charts
- [ ] Detailed result analysis
- [ ] History page + filters
- [ ] Trend charts
- [ ] Personal bests per category
- [ ] Pagination/incremental loading
- [ ] JSON backup export/import with preview and duplicate merge
- [ ] Invalid/oversized import handling
- [ ] CSV export
- [ ] Storage usage display and retention controls
- [ ] Share text summary + image card
- [ ] Optional encoded URL share with size cap
- [ ] Mode regression matrix
- [ ] Contrast audit
- [ ] Phase 2 exit report

## Deferred — cloud and social scope

Not in v1; retained for traceability.

- [ ] Accounts, registration, login, logout, password reset
- [ ] Cloud settings or history sync
- [ ] Public profiles
- [ ] Server-validated leaderboards
- [ ] Server-hosted share links
- [ ] Real-time multiplayer

## Phase 3 — Optional local advanced modes

Only after Phase 2 is stable.

- [ ] Custom word lists
- [ ] Challenge links
- [ ] Daily challenges (local)
- [ ] Keyboard-layout visualisation
- [ ] Personalised weak-character analysis
- [ ] Additional modifiers
- [ ] Installable PWA/offline shell
- [ ] Multiplayer (not planned; separate design)

## Open decisions

| Decision | Chosen | Status |
| --- | --- | --- |
| Hosting | Cloudflare Pages | Decided |
| Visual direction | Lab notebook | Decided |
| Package manager | npm | Decided |
| Share format | Text + image first; encoded URL optional | Decided |
| PWA | Defer; no service worker in Phase 1 | Decided |
