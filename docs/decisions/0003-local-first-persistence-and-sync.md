# ADR 0003 — Local-First Persistence, Backup, and Future Sync

- **Status:** Local storage accepted; cloud sync deferred
- **Date:** 2026-10-27
- **Deciders:** Product owner, implementation agent
- **Related:** [Data model](../phase-0/03-data-model.md), [Architecture](../phase-0/01-architecture.md#9-persistence-and-data-access), [ADR 0005](0005-local-only-v1.md)

## Context

TypeLab v1 is a local-only typing app. Users must be able to type, keep settings, and retain history without an account or network. There is no remote copy, so browser storage is the source of truth and export/import is the only durable backup.

The original spec contemplated cloud sync. That scope is deferred; the local design should not make a future sync layer impossible.

## Decision

### Storage split

- **localStorage:** lightweight settings, versioned and Zod-validated.
- **IndexedDB (Dexie):** result history and lightweight metadata.
- **Export files:** versioned JSON backup and CSV export.

### Repository layer

The engine and UI depend on interfaces:

- `SettingsRepository`
- `ResultRepository`
- `TransferService` (JSON/CSV export and validated import)

Local implementations ship in Phase 1/2. The engine never imports a storage module.

### Write path

1. Save every terminal result (`completed` or `failed`) locally, including flags and bounded interval samples.
2. Never block the result screen on storage; if a write fails, keep the result in memory for the session and show an export action.
3. Request persistent storage with `navigator.storage.persist()` where available.
4. Show the last export date and warn when storage usage is high.

### History and identity

- History is append-only; a result is never edited.
- Every result has a client-generated `clientTestId`, unique in IndexedDB, for merge/dedupe.
- Deleting a result is explicit and confirmed; offer export first.
- No silent pruning. Retention is user-configurable; if pruning is enabled, the UI explains what will be removed and offers export first.

### Backup

- JSON backup includes `format`, `schemaVersion`, `exportedAt`, `settings`, and `results`.
- Import validates the envelope and every result with Zod, enforces size/row caps, previews the merge, and rejects invalid rows without partial application.
- Merge by `clientTestId`; never overwrite an existing result.
- Settings import is a separate explicit choice.
- CSV is export-only.

### Failure behaviour

- Quota/blocked storage: show a clear error, keep the result in memory, offer export.
- Corrupt settings: back up the raw value, load defaults, show a notice.
- Failed Dexie upgrade: open a recovery screen with export/import instructions.

### Future sync

No sync is planned or estimated for v1. If it is added later, `clientTestId`, `scoringVersion`, `flags`, `samples`, and the repository interfaces are the extension points. A separate design would cover identity, server validation, conflicts, and RLS.

## Consequences

**Positive**

- Anonymous use is fully functional without a backend.
- No result is lost because a network request failed.
- Storage can be swapped or tested with mocks.
- A future sync layer does not require an engine rewrite.

**Negative / trade-offs**

- Browser storage can be cleared or evicted; users must export backups.
- No cross-device history without manual export/import.
- IndexedDB requires migrations and quota handling.
- Import is a new untrusted-input surface that needs strict validation.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Cloud-only history | Breaks local-only use and offline typing |
| localStorage for history | Size limits and synchronous access make it unsuitable |
| No export/import | Unacceptable data-loss risk for a local-only product |
| Silent pruning to control quota | Violates the no-silent-history-loss requirement |
| Sync in v1 | Adds the highest-risk scope the owner explicitly chose to defer |

## Follow-ups

- [ ] Implement Dexie schema migrations and fake-IndexedDB tests.
- [ ] Implement JSON backup/import with preview and validation.
- [ ] Add storage-usage and last-export UI.
- [ ] Document the no-sync limitation in the README and settings page.
