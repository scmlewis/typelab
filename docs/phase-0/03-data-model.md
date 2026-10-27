# Phase 0 — Local Data Model and Migrations Plan

**Status:** Revised for local-only v1  
**Scope:** localStorage settings, IndexedDB history, versioned export/import. No cloud database, accounts, or sync.  
**Related:** [Architecture](01-architecture.md), [ADR 0005](../decisions/0005-local-only-v1.md), [deferred cloud design](../decisions/0003-local-first-persistence-and-sync.md)

## 1. Principles

1. **The device is the source of truth.** Results and settings live in the browser.
2. **Export/import is the backup.** No remote copy exists.
3. **History is immutable.** A result is never edited; deletion is explicit.
4. **Every result records its scoring version.** Old results are never silently rescored.
5. **Tags and flags are persisted.** Charts and personal bests can be recomputed or filtered without a migration.
6. **Imports are untrusted input.** Validate, size-limit, preview, and merge; never execute or partially apply.
7. **No personal data leaves the device.** No email, IP address, analytics, or tracking.

## 2. TypeScript domain types

```ts
type TestMode = 'timed' | 'words' | 'quote' | 'custom';
type ErrorPolicy = 'free' | 'strict' | 'no-backspace';
type ResultFlag = 'no-input' | 'under-one-second' | 'failed' | 'low-confidence';

interface CharacterStatistics {
  correct: number;
  incorrect: number;
  extra: number;
  missed: number;
  correctSeparators: number;
  extraSeparators: number;
  missedSeparators: number;
}

interface IntervalSample {
  startMs: number;      // offset from test start
  durationMs: number;   // bucket length (normally 1000, final may be shorter)
  chars: number;        // committed characters in the bucket
  wpm: number;          // normalised bucket speed
}

interface TestResult {
  id: string;                 // UUID, stable local identifier
  clientTestId: string;       // stable idempotency key for future import/merge
  testMode: TestMode;
  language: string;
  configuration: TestConfig;
  promptId: string;
  seed: number;
  durationMs: number;         // timed: configured; words/quote/custom: elapsed
  wordCount: number | null;
  netWpm: number;
  rawWpm: number;
  accuracy: number;
  characterStatistics: CharacterStatistics;
  consistency: number;
  flags: ResultFlag[];
  samples: IntervalSample[];   // bounded; see storage rules below
  scoringVersion: string;      // e.g. '1.0.0'
  generatorVersion: string;
  failureReason: string | null;
  completedAt: string;         // ISO 8601
  createdAt: string;           // ISO 8601, local insert time
}
```

`TestConfig` is the serialisable shape defined in the architecture: mode, duration/word count, language, vocabulary, punctuation, numbers, error policy, quote/custom text, seed.

### 2.1 Result semantics

- **`durationMs`:** for `timed`, the configured duration; for `words`, `quote`, and `custom`, the measured elapsed time.
- **`flags`:** `no-input`, `under-one-second`, `failed`, and `low-confidence` are persisted. Results with `no-input`, `under-one-second`, or `failed` are stored for history but excluded from personal bests and trend charts by default. History offers a "show excluded tests" filter.
- **Accuracy and rounding:** accuracy is attempt-based and includes separators (a correct separator is a correct attempt; an extra separator is an incorrect attempt). Net/raw WPM and consistency are stored to one decimal; accuracy to two decimals.
- **Timed character statistics:** only words up to and including the active word are scored. Untouched trailing filler is not counted as `missed`.
- **`samples`:** one sample per second, plus a final partial bucket when it is ≥500 ms. Cap at **600 samples** (10 minutes); longer custom tests store the first 600 seconds and set `low-confidence`. Charts are rendered from these samples, so no future migration is needed.
- **Category rules:** `timed` and `words` use the standard category key, including the vocabulary pool because it changes difficulty. `quote` uses the quote ID (`quote:<quoteId>:<language>:<errorPolicy>`), so each quote has its own best. `custom` results are **not compared** for personal bests because the text is arbitrary; they still appear in history and trends with a "custom" label.
- **Cancelled tests** are not persisted. `failed` and `no-input` results are persisted with flags; they are not scored for comparison.

## 3. Settings storage

Settings are small, so `localStorage` is appropriate. History is not.

Key: `typelab.settings`

```ts
interface StoredSettings {
  schemaVersion: number;   // current: 1
  settings: Settings;      // Zod-validated shape
  updatedAt: string;       // ISO 8601
}
```

Rules:

- Read → parse → validate with Zod → migrate if the schema version is older → save the migrated shape.
- Invalid or unreadable data: keep a backup copy under `typelab.settings.corrupt.<timestamp>`, then load defaults and show a visible notice. Never delete silently.
- Settings export is part of the full backup; settings import is validated and previewed.
- Defaults are versioned in code so "reset to defaults" is deterministic.

## 4. History storage (Dexie)

```ts
db.version(1).stores({
  results: 'id, &clientTestId, completedAt, testMode, language, [testMode+language], [testMode+completedAt]',
  meta: 'key'
});
```

`meta` stores small values such as `lastExportAt`, `lastImportAt`, and `storageNoticeDismissedAt`. It does not store settings or results.

### 4.1 IndexedDB rules

- Results are inserted in a single transaction.
- `clientTestId` is unique, so repeated imports cannot duplicate a result.
- Deletes are explicit and confirmed; the UI offers export first.
- Queries are paginated by `completedAt` descending; no full-table scan for the history page.
- History is lazy-loaded by route; chart data comes from the stored `samples`.

### 4.2 Retention, quota, and durability

- **No silent deletion.** The default is to keep all results. The app shows storage usage via `navigator.storage.estimate()` and warns when usage is high.
- The user can configure a retention cap by count or age. If pruning is enabled, the UI explains what will be removed and offers export first.
- The app calls `navigator.storage.persist()` when available and records whether persistent storage was granted.
- If a write fails (quota, blocked storage, private mode), the result stays in memory for the current session and the UI shows a clear error with an export action. It is never silently lost.
- Clearing browser data deletes everything. The settings page shows the last export date and a backup reminder.

## 5. Backup format

### 5.1 JSON backup

```jsonc
{
  "format": "typelab-backup",
  "schemaVersion": 1,
  "exportedAt": "2026-10-27T12:00:00.000Z",
  "appVersion": "0.1.0",
  "settings": { /* Settings */ },
  "results": [ /* TestResult[] */ ]
}
```

Rules:

- Export downloads a `.json` file with the current settings and all results (or a filtered range, if chosen).
- Import accepts only `format: "typelab-backup"` and `schemaVersion` ≤ the supported version.
- Size limits: reject files over **25 MB** or more than **20,000 results** before parsing deeply.
- Validate every result with Zod; reject the whole import if any required record is invalid, and show the row numbers.
- Preview before writing: number of new results, number of duplicates, settings changes, and any rejected rows.
- Merge by `clientTestId`. An existing result with the same `clientTestId` is kept; the import does not overwrite it. Report the duplicate count.
- Settings import is a separate explicit choice; do not silently replace local settings when importing history.
- After import, write `meta.lastImportAt` and show a summary.

### 5.2 CSV export

Columns:

```text
completed_at,test_mode,language,duration_ms,word_count,net_wpm,raw_wpm,accuracy,consistency,scoring_version,flags
```

CSV is export-only. It is for spreadsheets and analysis, not a restore format.

### 5.3 Share payloads

Sharing is client-side only.

- **Text summary:** copy a short result description with WPM, accuracy, consistency, mode, and timestamp.
- **Image card:** render a share card on a canvas and download/copy it. Custom text is excluded by default.
- **Encoded URL:** optional, using a compact payload compressed with `lz-string` (or equivalent) in the URL fragment. Cap the encoded payload at **4 KB**; if it exceeds the cap, offer the image/text share instead.
- The share route validates and renders escaped text only; it never injects HTML.
- There is no server-hosted short link, public profile, or leaderboard.

## 6. Migrations

### 6.1 IndexedDB / Dexie

- `db.version(1)` is the initial schema.
- Future changes use Dexie's versioned upgrade functions. Every upgrade must be tested against a database created by the previous version.
- Never drop a table or field without an export path and a documented migration.
- If an upgrade fails, the app opens a recovery screen with export/import instructions rather than a blank page.

### 6.2 Settings schema

- `settings.schemaVersion` starts at `1`.
- Migrations are pure functions from `vN` to `vN+1`, covered by fixtures.
- Unknown future versions are rejected with a clear "this backup is from a newer version" message.
- Invalid settings are backed up and reset, never silently discarded.

### 6.3 Backup schema

- `format` and `schemaVersion` are required.
- Import supports the current version and documented older versions.
- Export always writes the current version.
- Migration tests cover v1 → current and reject future versions.

## 7. Test plan for the data layer

| Area | Tests |
| --- | --- |
| Settings | Round-trip; invalid JSON; missing keys; old schema migration; corrupt backup; reset to defaults |
| Results | Save/read/list/delete; unique `clientTestId`; pagination; flags/samples round-trip; degenerate filtering |
| Quota | Simulated quota error; blocked IndexedDB; persistent-storage denial; clear error and export path |
| Backup | Export/import round-trip; duplicate merge; invalid row; oversized file; future schema; settings-only import |
| CSV | Header/row escaping; no import path; stable column order |
| Share | Text/image generation; encoded payload size cap; escaped output; custom text excluded |
| Retention | Warning thresholds; explicit prune only; no silent deletion |

## 8. Future cloud extension (not in v1)

If the product ever adds sync, the repository interfaces and `clientTestId` are the extension points. A future design would need:

- account identity and authentication;
- a server-side result schema and validation;
- idempotent upload using `clientTestId`;
- conflict rules for settings;
- RLS/authorization tests.

None of that is planned, estimated, or implemented for v1. See [ADR 0003](../decisions/0003-local-first-persistence-and-sync.md) and [ADR 0004](../decisions/0004-auth-rls-and-leaderboard-validation.md) for the deferred design.

## 9. Open interpretations

1. **No `user_id` in v1.** Local results are device-scoped. `clientTestId` remains for future import/merge and duplicate prevention.
2. **No cross-device sync.** Moving data requires export/import; the UI states this plainly.
3. **Custom text is local-only.** It is stored in the owner's local configuration and excluded from share payloads by default.
4. **Degenerate results are retained but filtered.** `failed`, `no-input`, and `under-one-second` results are visible only with an explicit history filter.
5. **Samples are private.** They power charts and are not included in share payloads.
6. **Quote/custom categories:** quotes compare per quote ID; custom tests are not compared for personal bests.
7. **Storage is best-effort.** Browser eviction is outside the app's control; export is the only durable backup.
