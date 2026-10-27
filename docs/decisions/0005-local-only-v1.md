# ADR 0005 — Local-Only v1 Product Scope

- **Status:** Accepted
- **Date:** 2026-10-27
- **Deciders:** Product owner
- **Related:** [Product spec](../product-spec.md), [Architecture](../phase-0/01-architecture.md), [Implementation plan](../phase-0/05-implementation-plan.md)

## Context

The original specification described a full P1 release with accounts, cloud synchronisation, public profiles, server-validated leaderboards, and shareable result links. Building those features requires authentication, a Postgres schema, Row Level Security, sync conflict handling, server-side validation, and ongoing security work.

The product owner has chosen a **polished local-first typing app** for v1. The goal is a fast, reliable, private typing tool with excellent input handling, statistics, history, themes, and analytics — without the operational and security burden of a social platform.

## Decision

v1 is local-only:

- No backend, accounts, authentication, or sessions.
- No cloud database, RLS, Edge Functions, or service-role credentials.
- No cross-device sync or remote backup.
- No public profiles, leaderboards, or server-hosted share links.
- localStorage for settings; IndexedDB (Dexie) for history.
- Versioned JSON export/import and CSV export as the backup path.
- Client-side sharing: text summary, image card, and an optional size-capped encoded URL.

The following are retained because they are valuable in a local-only app and keep a future extension possible:

- Pure, framework-free typing engine and versioned scoring.
- `clientTestId` for duplicate-safe import/merge.
- Repository interfaces for settings, results, and transfer.
- Result flags, bounded interval samples, and scoring versions.
- Accessibility, reduced motion, keyboard-first navigation, and privacy by default.

## Consequences

**Positive**

- Much faster path to a polished product; effort goes into typing quality rather than auth/sync.
- No server-side attack surface, no user data leaving the device, no analytics.
- Works offline after load and is cheap to host.
- No leaderboard cheating or RLS misconfiguration risk.
- The local data model is a clean foundation for optional future sync.

**Negative**

- No cross-device history, accounts, public profiles, or leaderboards.
- Browser storage can be cleared; export/import must be prominent.
- Sharing is less convenient than a stable short URL.
- The original P1 social requirements remain unfulfilled by design.

## Revisit criteria

Only reconsider a cloud layer if:

1. Users explicitly ask for cross-device sync or public competition.
2. The local product is stable and the maintenance budget exists for auth, RLS, and sync.
3. A separate technical design covers identity, validation, conflicts, privacy, and abuse.
4. The product owner explicitly approves the scope and cost.

Until then, no cloud code, schema, dependency, or account system is added.

## Alternatives considered

| Alternative | Why rejected for v1 |
| --- | --- |
| Full Supabase social platform | Highest complexity and risk; delays the core typing product |
| Local-only with a hidden future sync hook | This is the chosen approach; interfaces are kept, but no code is written |
| Cloud-only app | Breaks offline/local-first use and privacy |
| Local-only without export/import | Unacceptable data-loss risk |

## Follow-ups

- [ ] Approve hosting and visual direction.
- [ ] Build Phase 1 (local MVP) and verify input/timer/storage behavior in real browsers.
- [ ] Build Phase 2 (analytics, themes, export/import, sharing).
- [ ] Keep the README and settings page explicit that data is local-only.
