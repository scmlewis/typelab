# ADR 0004 — Authentication, RLS, and Leaderboard Validation

- **Status:** Deferred — not in v1 scope
- **Date:** 2026-10-27
- **Deciders:** Product owner, implementation agent
- **Related:** [ADR 0005](0005-local-only-v1.md), [Data model](../phase-0/03-data-model.md)

> This ADR records the cloud design that was considered and deferred. Nothing in it is implemented in v1. It is retained so a future decision can start from a documented baseline rather than a blank page.


## Context

TypeLab needs optional accounts, cloud settings/history, public profiles, and leaderboards. Anonymous use must continue when auth or the cloud is unavailable. Leaderboards must not trust client submissions, and private data must not leak into public pages. The specification explicitly forbids claiming client-side anti-cheat makes scores tamper-proof.

## Decision

### Authentication

- Supabase Auth with email/password and password reset.
- Sessions persisted by the Supabase client.
- Anonymous users are first-class; auth is additive.
- OAuth can be added later without changing the data model.

### Database access

- RLS enabled on every user-owned table.
- Users can read/delete their own `test_results`, read/write their own `user_settings`, and manage their own `result_shares`.
- Users cannot read another user's history or settings.
- Public profile data is exposed only through explicit, sanitised functions/views.
- `test_results` has no direct insert/update grants; writes go through `submit_test_result`.

### Validated writes

`submit_test_result` is a `security definer` SQL function that:

- requires an authenticated user;
- validates payload shape and ranges;
- enforces a per-user submission rate limit;
- inserts idempotently on `(user_id, client_test_id)`;
- computes leaderboard eligibility;
- returns the existing row on retry.

### Leaderboards

- Participation is opt-in (`profiles.leaderboard_opt_in`).
- Eligibility stored on the result is **plausibility only**; opt-in is joined at read time, so changing the setting takes effect immediately for existing results.
- Initially limited to standard timed/words English configurations with punctuation/numbers off.
- Ranking: net WPM desc, accuracy desc, consistency desc, earlier completion, result ID.
- Results with different scoring versions are not ranked against each other.
- Eligibility uses server-side plausibility rules (duration, maximum WPM, net ≤ raw, stats consistency, rate limit, result age).
- Leaderboards are derived from eligible records initially; a materialised table is added only if needed for performance.

### Public sharing

- Share links use opaque tokens in `result_shares`.
- Public access goes through `get_shared_result(token)`, which returns only sanitised fields.
- Custom text, settings, email, and raw configuration are excluded.
- Tokens are revocable.

### Privileged operations

- Account deletion runs in an Edge Function that verifies the JWT and uses the service role to delete the auth user; cascading foreign keys remove owned rows.
- The service-role key exists only in server-side secrets and is never present in a `VITE_*` variable or the client bundle.

## Consequences

**Positive**

- Cross-user isolation is enforceable and testable.
- Duplicate submissions are impossible under normal retries.
- Public surfaces have a narrow, auditable payload.
- Leaderboards cannot be written directly by clients.

**Negative / trade-offs**

- Client-submitted scores can still be forged by a determined user; plausibility checks are not proof. This is documented, and no prizes should rely on them without stronger verification.
- The security-definer functions need careful review and a fixed `search_path`.
- SQL validation duplicates some Zod rules; the server is authoritative.
- Derived leaderboards may need optimisation later.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Client-side anti-cheat only | Explicitly forbidden by the specification and ineffective |
| Direct client inserts into leaderboard tables | Trivially forgeable |
| Storing raw keystroke telemetry for server recomputation | Large, privacy-heavy, still forgeable; not justified for P1 |
| Public `test_results` RLS policy | Risks leaking custom text and private configurations |
| Custom auth server | Unnecessary operational burden |

## Follow-ups

- [ ] Write two-user RLS integration tests before Phase 3 exit.
- [ ] Add a bundle scan that fails if a service-role key or secret appears.
- [ ] Document leaderboard limitations and privacy in the public UI.
- [ ] Review security-definer functions for search-path and grant mistakes.
