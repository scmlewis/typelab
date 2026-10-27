# Phase 0 — Risk Register (Local-Only v1)

Scoring: **Likelihood** and **Impact** are High / Medium / Low.  
Owner is the implementer unless a decision is needed from the product owner.

| ID | Risk | Likelihood | Impact | Mitigation | Trigger / early warning | Phase |
| --- | --- | --- | --- | --- | --- | --- |
| R-01 | Typing engine becomes coupled to React, making it hard to test and causing per-keystroke re-renders | Medium | High | Framework-free engine; injectable clock; external store with selectors; ESLint import boundaries; benchmark | Engine imports React/Dexie; p95 interaction >100 ms; whole test flickers per key | 1 |
| R-02 | Input edge cases: IME, dead keys, mobile keyboards, autofill, focus loss | High | High | Hidden textarea + `input`/`beforeinput` + composition handling; real-browser tests; documented unsupported policy; manual iOS/Android check | Duplicate/missing characters; composition commits twice; mobile keyboard does not open | 1 |
| R-03 | Timer drift, background-tab throttling, boundary flakiness | Medium | High | Monotonic clock; engine checks time on input and tick; timed elapsed capped at duration; Playwright clock and fake-clock tests | Results over/under duration; timer jumps; E2E boundary tests flaky | 1 |
| R-04 | Scoring ambiguity or silent formula changes | Medium | High | One versioned scoring module; documented formulas and edge cases; fixture tests; `scoringVersion` on every result; no retroactive rescoring | Live and result WPM disagree; historical results change after refactor | 1 |
| R-05 | Local history is lost when browser storage is cleared or evicted | High | Critical | Export/import as the primary backup; `navigator.storage.persist()`; last-export reminder; clear documentation; never silently delete | User cannot find old results; IndexedDB empty after browser cleanup | 1–2 |
| R-06 | Quota or storage write failure loses a just-finished result | Medium | High | Keep the result in memory for the session; surface a clear error; offer immediate export; test simulated quota/blocked storage | Write throws; result screen shows no saved state | 1–2 |
| R-07 | Malicious or corrupt import file causes crashes or data damage | Medium | High | Zod validation; size/row caps; reject whole file on invalid required rows; preview; merge by `clientTestId`; no code execution; no prototype pollution | Import throws; partial data appears; huge file freezes the tab | 2 |
| R-08 | Share payload leaks custom text or exceeds URL limits | Medium | High | Exclude custom text by default; preview before sharing; 4 KB encoded cap; escaped rendering; text/image fallback | Share URL contains private text; share page renders raw HTML; copied link is truncated | 2 |
| R-09 | Bundle size exceeds budget (charts, Dexie) | Medium | Medium | Lazy routes; Recharts only on results/history; no component kit; visualizer in CI; budget enforced | Initial bundle >180 KB gzip; slow first load on mobile | 1 |
| R-10 | SPA deep links 404 on static hosting | Medium | Medium | Choose a host with rewrites; `_redirects`/`vercel.json`; test direct navigation; 404 fallback if GitHub Pages | `/results/:id` works in-app but 404s on refresh | 1 |
| R-11 | Typing interface is inaccessible or unusable with a screen reader | Medium | High | Keyboard-first design; labelled hidden input; focus management; live-region results; chart alternatives; contrast checks; manual audit | Focus gets trapped; no announcement after completion; low-contrast errors | 1–2 |
| R-12 | Settings migration or corrupt data resets preferences silently | Medium | High | Versioned schema; backup corrupt payload; visible notice; migration fixtures; reset-to-defaults is explicit | Settings reset unexpectedly; app opens with defaults and no explanation | 1–2 |
| R-13 | Timing-sensitive tests are flaky and erode trust in CI | High | Medium | Fake clock in unit tests; Playwright clock; deterministic seeds; no real `setTimeout` waits; stable fixtures | Intermittent E2E failures; tests passing locally but not CI | 1 |
| R-14 | Visual direction churn delays UI work | Medium | Medium | Approve a direction before Phase 1 UI; tokens separated from components; themes are CSS variables | Repeated redesigns; no agreed palette/typography | 1 |
| R-15 | Browser autofill/password managers or spellcheck interfere with the hidden input | Medium | Medium | `autocomplete=off`, `spellcheck=false`, `autocorrect=off`, `data-lpignore`/`data-1p-ignore` where appropriate; test with extensions | Random text inserted; red squiggles; password manager popups | 1 |
| R-16 | Large local histories degrade IndexedDB or history UI | Medium | Medium | Pagination/incremental loading; indexes; lazy history route; storage-usage display; export; no full-table scans | Slow history page; memory growth; quota warnings | 2 |
| R-17 | Scope creep from local advanced features delays a polished core | High | High | Phase gates and the project checklist; P2 local features only after Phase 2 exit; no cloud/leaderboard work | New feature requests mid-phase; redesign before core is stable | All |
| R-18 | Users expect cross-device sync or leaderboards and perceive the app as incomplete | Medium | High | State the local-only scope plainly in the README, settings, and onboarding; offer export/import; keep a "future sync" note without promising it | Requests for accounts/sync; confusion about data on another device | 1+ |
| R-19 | Dexie schema upgrade fails and the app cannot open history | Low | High | Versioned upgrades with fixtures; recovery screen; export-before-upgrade prompt; never drop data without a path | Blank history page; upgrade exception in console | 2+ |
| R-20 | Safari/private-mode IndexedDB behaves differently or is evicted aggressively | Medium | High | Test Safari and private mode; feature-detect storage; persistent-storage request; export reminder; graceful in-memory fallback | Results disappear on reload; storage API throws | 1–2 |

## Deferred cloud risks

The original cloud risks are intentionally out of scope for v1: RLS misconfiguration, leaderboard cheating, sync duplicates/conflicts, account deletion/export, leaderboard query performance, and public share/profile leaks. They become relevant only if a future sync/social layer is approved. See [ADR 0004](../decisions/0004-auth-rls-and-leaderboard-validation.md).

## Top five to watch

1. **R-05 local data loss** — the defining constraint of a local-only product.
2. **R-02 input edge cases** — the highest-probability source of "it works on my desktop" failures.
3. **R-01 engine/UI coupling** — the main long-term maintainability risk.
4. **R-07 import safety** — untrusted files are the main new attack surface.
5. **R-18 expectation mismatch** — users must understand there is no sync or leaderboard.
