# Phase 0 — Architecture Proposal

**Status:** Approved; Phase 1 in progress  
**Scope:** P0 and local P1 features. Accounts, cloud sync, public profiles, and leaderboards are deferred indefinitely.

## 1. Recommendation in one page

Build TypeLab as a **polished local-first React single-page application** with a **framework-free typing engine**. There is no backend in v1; all data lives on the device, and export/import is the backup mechanism.

| Layer | Choice |
| --- | --- |
| UI | React 19 + TypeScript (strict) + Vite |
| Styling | Tailwind CSS 4 + CSS custom properties for themes |
| Routing | React Router 7 (declarative/data mode) |
| Charts | Recharts, lazy-loaded |
| Validation | Zod (config, settings, imports, share payloads) |
| Settings | localStorage, versioned schema |
| History | IndexedDB via Dexie |
| Backup | Versioned JSON export/import + CSV export |
| Backend | None in v1 (no accounts, no server, no tracking) |
| Tests | Vitest + React Testing Library + Playwright |
| Hosting | Static host with preview deployments (Cloudflare Pages recommended) |
| Package manager | npm |

The most important architectural rule: **the typing engine is a pure TypeScript state machine that knows nothing about React or storage.** Browser events are normalised by an adapter, the engine consumes semantic input, and React subscribes to snapshots.

Why this shape:

- It satisfies the specification's hard requirements: deterministic engine, monotonic clock, composition support, restart safety, strict typing, local-first anonymous use.
- It ships the valuable product quickly: core typing, analytics, themes, history, and backup — without auth, RLS, sync, or leaderboard abuse work.
- It avoids infrastructure the specification explicitly discourages: no custom server, no Redis, no microservices, no multiplayer infrastructure.
- The repository interfaces keep a future optional sync layer possible without rewriting the engine.

## 2. Approaches considered

### A. Local-only Vite SPA (chosen)

- Static frontend; settings in localStorage, history in IndexedDB.
- No accounts, no backend, no third-party analytics.
- **Pros:** fastest path to a polished product; no auth/RLS/sync risk; excellent privacy; works offline after load; trivial hosting.
- **Cons:** no cross-device sync, public profiles, or server-validated leaderboards; browser storage can be cleared, so export/import is essential.
- **Verdict:** chosen for v1.

### B. Supabase-backed social platform (deferred)

- Add Postgres, Auth, RLS, validated writes, sync, profiles, and leaderboards.
- **Pros:** cross-device history, accounts, public competition.
- **Cons:** the riskiest and slowest part of the original spec; requires ongoing security and operational work.
- **Verdict:** deferred indefinitely. The local data model and repository interfaces are designed so this can be added later if the product needs it.

### C. Next.js full-stack

- Server components and route handlers.
- **Pros:** SSR and server-side auth.
- **Cons:** typing is client-centric and gains nothing from SSR; adds runtime complexity; no server is needed for v1.
- **Verdict:** rejected.

### D. Cloudflare Workers + D1/Durable Objects

- Custom backend on Workers, D1 for SQL, Durable Objects for real-time.
- **Pros:** edge performance; suited to multiplayer.
- **Cons:** unnecessary infrastructure for a local-only app; custom backend burden.
- **Verdict:** rejected. Revisit only if real-time multiplayer is designed later.

## 3. Stack details

### 3.1 Runtime and build

- **React 19**, function components, no class components except error boundaries if needed.
- **TypeScript strict**: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`.
- **Vite** with `@vitejs/plugin-react`.
- **Tailwind CSS 4** via `@tailwindcss/vite`; theme tokens as CSS variables under `data-theme`.
- **ESLint 9** flat config with `typescript-eslint`, React hooks rules, and import-boundary rules.
- **Prettier** for formatting.
- **npm** with a committed `package-lock.json`.

### 3.2 Application libraries

| Concern | Library | Reason |
| --- | --- | --- |
| Routing | `react-router` 7 | Lightweight, data loaders if needed, well understood |
| Charts | `recharts` | Declarative React charts; results datasets are small |
| Validation | `zod` | Shared runtime schemas for config/settings/import/share payloads |
| Local DB | `dexie` | IndexedDB ergonomics and migrations |
| Dates | `date-fns` | Small, tree-shakeable, no moment-style global |
| IDs | `crypto.randomUUID()` | Native, no dependency |
| Icons | `lucide-react` | Consistent, tree-shakeable |
| Radix primitives | Only if needed | Accessible dialog/menu/tooltip; avoid a full component library |

**Deliberately not included:** Redux, a UI kit, i18n framework, service worker/PWA, server-state library, animation framework. Add only when a measured need appears.

### 3.3 Fonts and visual identity

- Self-host fonts (no third-party font CDN) with `@fontsource` packages to avoid tracking and layout surprises.
- Proposed direction: **"lab notebook"** — warm off-white paper light theme, deep ink dark theme, one restrained accent, monospace type for the test surface, generous spacing, no gradients or glassmorphism.
- Typing font: a legible monospace (e.g. IBM Plex Mono or Geist Mono). UI font: a neutral sans (e.g. IBM Plex Sans or Geist Sans).
- Final font pairing and palette need sign-off before Phase 1 UI work. Themes are CSS-variable based, so changing them later is cheap.

## 4. System boundaries

```text
┌──────────────────────────────────────────────────────────────┐
│ React app                                                    │
│                                                              │
│  Browser events ──► InputAdapter ──► TypingEngine            │
│                                          │                   │
│                                          ▼                   │
│                                    EngineStore               │
│                                          │                   │
│                        ┌─────────────────┼──────────────┐    │
│                        ▼                 ▼              ▼    │
│                   Typing UI         Results UI     History UI│
│                                                              │
│  Settings/History ◄── Repository interfaces ──► Local repos   │
│                        │              │                      │
│                   localStorage    IndexedDB (Dexie)          │
│                                                              │
│  Export/import ◄── versioned JSON + CSV (no server)           │
└──────────────────────────────────────────────────────────────┘
```

### 4.1 Folder structure

```text
.
├─ docs/
│  ├─ decisions/                 # ADRs
│  └─ phase-0/
├─ public/
├─ src/
│  ├─ app/                       # providers, router, layouts, error boundary
│  ├─ engine/                    # framework-free typing domain
│  │  ├─ clock.ts
│  │  ├─ config.ts
│  │  ├─ generator/              # seeded prompt generation, word lists
│  │  ├─ input.ts                # normalised input types + adapter contract
│  │  ├─ machine.ts              # state machine
│  │  ├─ scoring/                # stats + scoring version
│  │  ├─ store.ts                # external store + subscriptions
│  │  └─ types.ts
│  ├─ features/
│  │  ├─ typing/                 # test surface, caret, live stats
│  │  ├─ results/                # result screen, charts
│  │  ├─ history/                # history list, filters, analytics
│  │  └─ settings/               # settings UI, themes
│  ├─ data/
│  │  ├─ local/                  # localStorage, Dexie schemas
│  │  ├─ repositories/           # interfaces + local implementations
│  │  └─ transfer/               # JSON/CSV export and import validation
│  ├─ components/                # shared accessible UI primitives
│  ├─ lib/                       # env, formatting, ids, dates
│  └─ styles/                    # tokens, themes, global CSS
└─ tests/
   ├─ e2e/
   └─ fixtures/                  # deterministic prompts and stats fixtures
```

**Boundary enforcement:** `src/engine/**` may import only from `src/engine/**` and small pure helpers in `src/lib/**`. It must not import React, Dexie, or feature components. Enforce with ESLint restricted-import rules in CI.

### 4.2 Routes

| Route | Phase | Notes |
| --- | --- | --- |
| `/` | P0 | Typing test |
| `/results/:resultId` | P0 | Local result, refresh-safe |
| `/settings` | P0 | Basic settings; expanded in Phase 2 |
| `/history` | P1 | Local history, filters, analytics |
| `/share` | P2 | Client-side share card/text; optional encoded payload |

Lazy-load history, results charts, and share routes. The home route must not pull chart code into its initial bundle.

## 5. Typing engine

### 5.1 Responsibilities

The engine owns:

- the immutable test configuration and generated prompt;
- the typed text state;
- the state machine (`idle`, `running`, `completed`, `failed`, `cancelled`);
- monotonic elapsed time and completion decisions;
- live and final statistics;
- the attempt log needed for accuracy and consistency.

The engine does **not** own:

- DOM events (the adapter does);
- timers (`requestAnimationFrame` lives in a ticker; the clock is injected);
- rendering;
- persistence;
- routing.

### 5.2 Core types (sketch)

```ts
type TestStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';

type TestMode = 'timed' | 'words' | 'quote' | 'custom';

type ErrorPolicy = 'free' | 'strict' | 'no-backspace';

interface TestConfig {
  mode: TestMode;
  durationMs?: number;          // timed
  wordCount?: number;           // words
  language: string;             // e.g. 'english'
  vocabulary: string;           // e.g. 'english-200'
  punctuation: boolean;
  numbers: boolean;
  errorPolicy: ErrorPolicy;
  quoteId?: string;
  customText?: string;
  seed: number;
}

interface Prompt {
  id: string;                   // deterministic hash
  words: string[];
  text: string;
  language: string;
  generatorVersion: string;
}

interface EngineSnapshot {
  status: TestStatus;
  testId: string;
  config: TestConfig;
  prompt: Prompt;
  typed: string[];              // final typed text, word-aligned
  activeWordIndex: number;
  activeCharIndex: number;
  elapsedMs: number;
  stats: LiveStats;
  result?: TestResult;          // present in terminal states
  scoringVersion: string;
}
```

### 5.3 State machine

| From | Event | To | Conditions / notes |
| --- | --- | --- | --- |
| `idle` | First committed character | `running` | Starts the monotonic clock at the commit timestamp |
| `idle` | Backspace / modifier | `idle` | Ignored before the first character |
| `running` | Character or space commit | `running` | Updates typed state and live stats |
| `running` | Backspace | `running` | Removes the last character; attempts remain for accuracy |
| `running` | Timed boundary reached | `completed` | `elapsedMs` capped at the configured duration |
| `running` | Final character of final word committed | `completed` | No trailing space required |
| `running` | Incorrect character with `strict` policy | `failed` | Ends immediately; result records the failure |
| `running` | Explicit cancel (Escape + confirm) | `cancelled` | Abandoned test; not persisted |
| `running` | Restart command | `cancelled` → `idle` | Abandons the current test and immediately creates a new one; Tab only moves focus |
| `completed` / `failed` / `cancelled` | Restart or new config | `idle` | New `testId`; old ticker/listeners/results disposed |

**Invariants**

1. `testId` is unique per test and never reused.
2. `config` and `prompt` are immutable once `running` starts.
3. `elapsedMs` is monotonic and never negative.
4. No input is accepted after a terminal state.
5. Every terminal test has a frozen `result` snapshot; later config changes cannot mutate it.
6. Restart creates a fresh engine instance or a fully reset one; no stale ticker, listener, or result survives.
7. Statistics are derived from engine state, never from render counts.
8. The prompt is reproducible from `(generatorVersion, seed, config)`.

### 5.4 Clock and ticker

```ts
interface Clock {
  now(): number; // monotonic milliseconds
}
```

- Production: `performance.now()`.
- Tests: a fake clock advanced explicitly.
- A `Ticker` calls `engine.tick(clock.now())` on `requestAnimationFrame` for display and to detect timed completion.
- The engine also checks elapsed time on every committed input, so a backgrounded tab or throttled rAF cannot extend a timed test.
- For timed tests: `elapsedMs = min(now - startedAt, durationMs)`.
- For untimed tests (words, quote, custom): completion time is the timestamp of the final commit, not the time the UI noticed it.
- Clock restarts are irrelevant because the value is monotonic, not wall-clock.

### 5.5 Restart and configuration changes

- Restart: new seed and new prompt by default, same configuration. "Repeat" reuses the seed/prompt.
- Changing config while `idle` replaces the prompt.
- Changing config while `running` requires explicit confirmation and starts a new test; the UI never mutates an active config.
- Completed results are frozen and stored independently of later config changes.

## 6. Input handling

### 6.1 Why not raw `keydown`

One `keydown` is not one committed character. IME, dead keys, autocorrect, virtual keyboards, and composition can all produce text without a 1:1 key event. The adapter must read **committed text**, not assume a US layout.

### 6.2 Adapter design

A visually hidden but focusable `<textarea>` is the input receptor:

- `aria-label="Typing input"`, `autocomplete="off"`, `autocapitalize="off"`, `autocorrect="off"`, `spellcheck="false"`.
- Positioned over the test surface, 1px opacity, not `display: none` (which cannot focus).
- The test surface forwards clicks/focus to it; a window-level keydown refocuses it when the test is active and focus is lost.
- On mobile, focusing it opens the virtual keyboard.

Event flow:

```text
keydown (control keys) ─┐
beforeinput/input ──────┼─► InputAdapter ─► EngineInput ─► TypingEngine
composition events ─────┘
```

Normalised inputs:

```ts
type EngineInput =
  | { type: 'insert'; text: string }   // one or more committed graphemes
  | { type: 'backspace' }
  | { type: 'cancel' };
```

Rules:

- **Insertions:** read the textarea value on `input`, commit it to the engine, then clear the textarea. This handles desktop, mobile, autocorrect, paste-like input, and IME commits uniformly.
- **Composition:** set a composing flag on `compositionstart`; do not process `input` while composing; on `compositionend`, commit the composed text once and clear the flag. Ignore keydown character handling during composition.
- **Backspace:** handle `beforeinput` with `deleteContentBackward` and `keydown` Backspace, with deduplication so one physical press produces one engine backspace. Backspace is ignored under `no-backspace`.
- **Spaces:** prevent default scrolling; commit a space as a word separator.
- **Shortcuts:** ignore Ctrl/Cmd/Alt combinations except explicitly supported app shortcuts. Never trap Tab; Tab must move focus for accessibility.
- **Repeat:** repeated key events are allowed only when the engine is `running`; they are normal input.
- **Paste:** rejected by default (non-character input) except in custom-text setup, where pasting into the custom-text field is allowed.
- **Focus loss:** the timer continues; typed state is preserved; an overlay invites the user to resume. No characters are dropped.
- **Visibility change:** timer continues monotonically; on return, the engine catches up and completes a timed test at the boundary if needed.

### 6.3 Keyboard layouts and unsupported input

- Input is interpreted from **committed characters**, so Dvorak, Colemak, AZERTY, and other layouts work without special cases.
- Dead keys and most IMEs are supported through composition.
- **v1 policy:** right-to-left scripts, emoji, and complex grapheme clusters are not supported as test content; they are documented as unsupported. The input adapter uses `Intl.Segmenter` when available so combined code points are handled as one grapheme where possible.
- **v1 policy:** if a platform produces no usable `input`/`composition` events (rare embedded webviews), the test is unsupported and the UI says so. Desktop Chrome, Edge, Firefox, and Safari plus iOS/Android stock keyboards are the supported matrix.
- Unsupported input must never silently score wrong characters as correct; it either commits text or reports unsupported.

## 7. Statistics and scoring

All formulas live in `src/engine/scoring/` and are versioned. Every persisted result carries `scoringVersion`. The initial version is **`1.0.0`**.

### 7.1 Definitions

Target text is a sequence of words joined by single spaces. Spaces are scored characters.

| Term | Definition |
| --- | --- |
| Attempt | One committed character insertion (including a space or extra character). Backspacing does not remove an attempt. |
| Correct attempt | The inserted character matches the target at that position. |
| Incorrect attempt | The inserted character does not match. |
| Extra attempt | A character inserted beyond the target word length. |
| Final correct / incorrect / extra | Counts after all corrections, based on the final typed text. |
| Missed | Target characters with no final typed character, including untouched trailing words and characters skipped by pressing space. |
| Correct separator | The single space that advances past a word. |
| Extra separator | Additional spaces beyond one per boundary. |
| Missed separator | A word boundary never passed before the test ended. |

**Treatment of corrected mistakes:** accuracy is attempt-based, so a corrected mistake still counts as an incorrect attempt and remains in the denominator. Final character statistics describe the text at the end of the test, so a corrected character is correct there. This distinction is deliberate and must be shown consistently everywhere.

### 7.2 Formulas

Let `elapsedMinutes = max(elapsedMs, 1000) / 60000`.

```text
netWpm  = (finalCorrect + correctSeparators) / 5 / elapsedMinutes
rawWpm  = (finalCorrect + finalIncorrect + finalExtra
           + correctSeparators + extraSeparators) / 5 / elapsedMinutes

accuracy = correctAttempts
           / (correctAttempts + incorrectAttempts + extraAttempts)
           * 100
```

- If there are zero attempts, accuracy is **0%** and the result is flagged `no-input`.
- If `elapsedMs < 1000`, WPM is computed with a 1-second floor and the result is flagged `under-one-second`. It is excluded from personal bests and trends.
- Raw WPM uses the final text, not cumulative keystrokes, so backspace spam cannot inflate it.
- Character statistics are final-state counts: `{ correct, incorrect, extra, missed, correctSeparators, extraSeparators, missedSeparators }`.
- **Accuracy includes separators as attempts:** a correctly placed separator is a correct attempt and an extra separator is an incorrect attempt, so the denominator is every committed attempt.
- **Timed prompts are filler:** a timed test only counts target words up to and including the active word. Untouched trailing words in the long timed prompt are not `missed`; a word-count, quote, or custom test counts every trailing word because the prompt itself is the finish line.
- **Rounding:** net/raw WPM and consistency are stored to one decimal; accuracy is stored to two decimals.

### 7.3 Consistency

Consistency measures pace variation across fixed intervals.

1. Divide the test into 1-second buckets aligned to the start.
2. Count every committed character in each bucket (correct, incorrect, extra, and separators; backspaces excluded). A commit at the exact completion instant belongs to the last bucket.
3. Convert each bucket to WPM: `chars / 5 / (bucketMs / 60000)`.
4. Include the final partial bucket only when it is at least 500 ms long; normalise it by its actual duration.
5. Compute the sample standard deviation of bucket WPMs and divide by the mean (coefficient of variation).
6. `consistency = clamp(0, 100, 100 * (1 - cv))`, stored to one decimal.
7. Cap the stored series at 600 buckets (10 minutes); a longer test keeps the first 600 seconds and is flagged `low-confidence`.

Edge cases:

- Fewer than two buckets → `0`.
- Mean of zero → `0`.
- A single very fast small bucket can produce a high WPM sample; this is documented and is why short tests are excluded from personal bests.

### 7.4 Completion and edge cases

| Case | Policy |
| --- | --- |
| Timed test reaches duration | Complete at exactly `durationMs`; ignore commits after the boundary |
| Word-count test final character | Complete on the final character of the final word; no trailing space required |
| Trailing space after final word | Ignored, not counted as extra |
| Strict-mode error | `failed`; result saved with failure reason and excluded from personal bests |
| No input | 0 WPM, 0% accuracy, `no-input` flag; still shows a result screen |
| Partial final interval | Included only if ≥500 ms, as above |
| Skipped word | Its untyped characters are missed; its separator counts as correct |
| Backspace to empty | Attempts remain in accuracy; final stats reflect the empty text |
| Zero elapsed | 1-second scoring floor plus `under-one-second` flag; never Infinity/NaN |
| Degenerate result (`no-input`, `under-one-second`, `failed`) | Persisted with flags; excluded from personal bests and trends by default; visible through a history filter |
| Quote / custom completion | Completes on the final character, like a word test; quote categories compare per quote ID; custom results are not compared for personal bests |
| Cancelled test | Not persisted; the result screen is not shown |

### 7.5 Best results

A personal best is only comparable within the same **category key**:

```text
timed:<durationMs>:<language>:<vocabulary>:<punctuation>:<numbers>:<errorPolicy>
words:<wordCount>:<language>:<vocabulary>:<punctuation>:<numbers>:<errorPolicy>
quote:<quoteId>:<language>:<errorPolicy>
```

Examples: `timed:60000:english:english-200:false:false:free`, `words:50:english:english-1k:false:false:free`.

Ranking within a category: `netWpm` desc, then `accuracy` desc, then `consistency` desc, then earlier `completedAt`, then result ID.
`custom` results are not compared for personal bests. Results with a different `scoringVersion` are never compared directly; the UI labels historical versions.

## 8. Rendering and performance

### 8.1 Subscription model

The engine is exposed through a small external store:

```ts
store.subscribe(listener): () => void
store.getSnapshot(): EngineSnapshot
```

React uses `useSyncExternalStore` with selectors. Components subscribe only to what they need:

- `TypingSurface` subscribes to typed state and active word.
- `LiveStats` subscribes to a 10 Hz quantised snapshot, not every keystroke.
- `Timer` subscribes to elapsed time only.
- `ResultScreen` receives a frozen result.

The engine never lives in React state, and a keystroke never re-renders the whole route.

### 8.2 Word rendering

- Each target word is a memoised component.
- On a normal keystroke, only the active word changes; previous words are stable.
- The caret is rendered inside the active word as an absolutely positioned element or a styled border, avoiding per-keystroke layout measurement.
- Typed characters are separate spans so correctness styling is CSS-only.
- Errors are communicated by underline/strikethrough in addition to colour; colour alone is not sufficient.

### 8.3 Budgets

| Budget | Target |
| --- | --- |
| Interaction processing p95 | < 100 ms on a representative desktop |
| Initial route JS | ≤ 180 KB gzip (provisional) |
| Lazy results/chart chunk | ≤ 120 KB gzip (provisional) |
| Timer display updates | ~10 Hz, not 60 Hz React renders |
| Animation | CSS transforms/opacity only; respect `prefers-reduced-motion` |

Measure with `rollup-plugin-visualizer`, Playwright timing, and a small engine benchmark suite. Budgets are provisional until the first production build.

## 9. Persistence and data access

### 9.1 Repositories

The engine and UI depend on interfaces, not storage:

```ts
interface SettingsRepository {
  load(): Promise<Settings>;
  save(settings: Settings): Promise<void>;
  reset(): Promise<void>;
}

interface ResultRepository {
  save(result: TestResult): Promise<void>;
  get(id: string): Promise<TestResult | null>;
  list(query: HistoryQuery): Promise<Page<TestResult>>;
  delete(id: string): Promise<void>;
}

interface TransferService {
  exportJson(): Promise<Blob>;
  exportCsv(): Promise<Blob>;
  importJson(file: File): Promise<ImportReport>;
}
```

Implementations: `LocalSettingsRepository` (localStorage), `LocalResultRepository` (Dexie), `TransferService` (validated JSON/CSV). No cloud implementation exists in v1.

### 9.2 Local storage

- **Settings:** localStorage, versioned `{ schemaVersion, settings }`, Zod-validated on read. Invalid or old data is migrated or reset with a visible notice; it is never silently discarded without a backup path.
- **History:** IndexedDB via Dexie. Each terminal result (`completed` or `failed`) stores the full result, configuration, prompt reference, scoring version, flags, and bounded interval samples. `cancelled` tests are not stored. Degenerate results are stored but excluded from personal bests/trends by default.
- **Durability:** browser storage can be evicted or cleared. The app requests persistent storage via `navigator.storage.persist()` when available and reminds the user to export a backup; export/import is the authoritative backup path.
- **Quota:** history is capped by count/age with a user-visible retention setting; export before pruning. Storage errors are surfaced, never silently swallowed.
- **In-progress tests:** not persisted in P0. A refresh abandons the test; a warning is shown on unload while running.

### 9.3 Export, import, and sharing

- **JSON export/import:** a versioned envelope containing `schemaVersion`, exported timestamp, settings, and results. Import is validated with Zod, size-limited, and previews what will be merged before writing.
- **CSV export:** results only, for spreadsheet analysis. CSV is export-only; it is not an import format.
- **Import semantics:** merge by `clientTestId`; never overwrite an existing result with a different payload. Invalid rows are rejected with a report, not partially applied.
- **Sharing:** client-side only. Copy a text summary, download an image card, or encode a compact result payload in a URL fragment. There are no server-hosted short links or public profiles.
- **No sync:** there is no cross-device synchronisation, account system, or remote backup in v1.

## 10. Backend

There is **no backend in v1**. This is a deliberate product decision, not an omission:

- No accounts, authentication, sessions, or password recovery.
- No Postgres, RLS, SQL functions, Edge Functions, or service-role credentials.
- No server-side leaderboards or public profiles.
- No third-party analytics or tracking.

Consequences:

- Data is device-local. Moving devices requires export/import.
- Browser storage can be cleared; the UI must make backup behavior obvious.
- Social features from the original spec are deferred indefinitely.

A future optional sync layer can be added behind the existing repository interfaces. It is not planned or estimated for v1. See [ADR 0003](../decisions/0003-local-first-persistence-and-sync.md) and [ADR 0004](../decisions/0004-auth-rls-and-leaderboard-validation.md) for the deferred design.

## 11. Configuration and reproducibility

Every test has a serialisable config validated by Zod:

- mode, duration or word count, language, vocabulary, punctuation, numbers, error policy;
- quote ID or custom text where applicable;
- seed;
- generator version and scoring version are recorded with the result.

Reproducibility:

- A seeded PRNG (mulberry32 or equivalent) generates word selection and punctuation/numbers transformations.
- `prompt.id` is a deterministic hash of `(generatorVersion, seed, config, generated text)`.
- Challenge links (P2) encode the config and seed, not the prompt text.
- Changing config before a test never mutates an active/completed test.

## 12. Testing strategy

| Layer | Tool | Coverage |
| --- | --- | --- |
| Unit | Vitest | Engine transitions, clock, input normalisation, scoring, generators, config/settings schemas, migrations |
| Component | Vitest + RTL | Typing surface, live stats, results, settings forms, accessibility roles |
| Integration | Vitest + fake IndexedDB + local repositories | Persistence, restart, import/export, retention, quota handling |
| E2E | Playwright | Core typing journeys, local recovery, responsive layouts, keyboard navigation, offline/reload behavior |

### 12.1 Required end-to-end journeys

These are the local-only v1 journeys. The original spec's account/sync/cross-user journeys are deferred with the cloud scope.

| # | Journey | Gate |
| --- | --- | --- |
| 1 | Complete a timed test | Phase 1 |
| 2 | Complete a word-count test | Phase 1 |
| 3 | Correct an error using backspace | Phase 1 |
| 4 | Restart before completion | Phase 1 |
| 5 | Complete a test at the timer boundary | Phase 1 |
| 6 | Refresh and recover local settings and history | Phase 1 |
| 7 | Export history and re-import it without duplicates | Phase 2 |
| 8 | Import invalid/oversized data and receive a safe error | Phase 2 |
| 9 | Verify responsive layouts and keyboard navigation | Phase 1 |
| 10 | Verify data survives reload and a simulated storage failure is reported | Phase 1/2 |
| 11 | Copy/share a result without exposing private custom text | Phase 2 |
| 12 | Complete a quote/custom-text test and recover it from history | Phase 2 |

Phase 1 must pass 1–6, 9, and the reload half of 10. Phase 2 adds 7–8, 11–12, and the storage-failure half of 10.

Determinism:

- Injectable clock and seeded prompts everywhere.
- Playwright's clock API for timer-boundary tests.
- Fixed fixtures for word lists and expected statistics.
- No test depends on the current date or unseeded randomness.

## 13. Hosting and environments

### 13.1 Hosting options

| Host | Preview deploys | SPA rewrites | Notes |
| --- | --- | --- | --- |
| **Cloudflare Pages** (recommended) | Yes, per branch/PR | `_redirects` | Fast global edge, generous free tier, simple static deploys |
| Vercel | Yes | `vercel.json` | Zero-config Vite, excellent DX, commercial limits |
| Netlify | Yes | `_redirects` | Comparable to Cloudflare Pages |
| GitHub Pages | Not natively | 404.html fallback | Matches sibling projects, but weakest fit for previews and clean routes |

**Recommendation:** Cloudflare Pages for preview deployments and SPA rewrites. If the owner prefers to stay entirely within GitHub, GitHub Pages is workable with a 404 fallback and a separate preview workflow, at the cost of convenience.

### 13.2 Environments

- **Local:** Vite dev server; no backend, no environment variables required.
- **Preview:** one static deployment per pull request/branch.
- **Production:** `main`, custom domain, static assets only.
- **Secrets:** none required in v1. If a future feature needs one, it must never be exposed through a `VITE_*` variable that grants privileged access.
- **Data:** each browser/origin has its own local data; preview and production deployments do not share storage.

## 14. Accessibility and security

### Accessibility

- Full keyboard operation: Tab moves focus, Enter/Space activate controls, Escape cancels a test with confirmation.
- Visible focus rings on every interactive element.
- The hidden input is labelled; the test surface has instructions; results are announced via a polite live region.
- Charts have accessible summaries or data-table alternatives.
- Errors use colour plus underline/strikethrough and explanatory text.
- Themes meet WCAG AA contrast; a contrast check runs in tests or CI.
- `prefers-reduced-motion` disables caret animation and chart transitions.
- Responsive layouts tested at mobile, tablet, and desktop widths.

### Security and privacy

- Validate all imported files with Zod, enforce size limits, and reject unknown fields.
- Treat imported JSON as untrusted: no code execution, no prototype pollution, no silent partial merges.
- No backend, no accounts, no cookies, no third-party analytics, and no data leaving the device.
- Custom text is local-only; share actions require an explicit preview and exclude custom text by default.
- URL-encoded share payloads are bounded and validated on read; they must never be rendered as HTML.
- Dependency and bundle checks run in CI; no secrets exist to leak.
- Document that clearing browser storage deletes history unless the user has exported a backup.

## 15. Explicit non-goals for this architecture

- No accounts, cloud sync, public profiles, server leaderboards, or remote backup in v1.
- No custom application server, Redis, background worker, or microservice.
- No SSR/Next.js unless a hard SEO requirement appears.
- No AI inference at runtime.
- No third-party UI kit, state framework, or analytics.
- No claim that local scores are comparable across users.

## 16. Decisions confirmed before Phase 1

| # | Decision | Chosen |
| --- | --- | --- |
| 1 | Hosting target | Cloudflare Pages (preview deploys + SPA rewrites) |
| 2 | Visual direction | “Lab notebook” (warm paper / ink, mono test surface) |
| 3 | Package manager | npm |
| 4 | Share format | Text summary + downloadable image first; encoded URL optional |
| 5 | PWA/installable shell | Deferred to Phase 2 optional; no service worker in Phase 1 |
