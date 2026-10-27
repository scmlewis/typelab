# TypeLab — Product Requirements & Engineering Specification

**Document status:** Implementation-ready baseline  
**Source:** Phase 0 request, supplied 2026-10-27  
**Product type:** Web application  
**Primary objective:** Build a production-quality, Monkeytype-inspired typing test platform using AI-assisted development.  
**Primary users:** People who want to measure typing speed, improve accuracy, practise different languages, and track long-term progress.

> **Scope decision — 2026-10-27:** v1 is a polished **local-first** typing app. Accounts, cloud sync, public profiles, server-validated leaderboards, and cross-device history are deferred indefinitely. Export/import replaces cloud backup. The P1 cloud requirements below are retained as a record of the deferred scope; the active plan is in `docs/phase-0/` and [ADR 0005](decisions/0005-local-only-v1.md).


## 1. Product objectives

Build a responsive, fast, keyboard-first typing platform with:

- Timed and fixed-word-count typing tests.
- Multiple languages and configurable word lists.
- Punctuation, numbers, quotes, and custom text modes.
- Real-time WPM, raw WPM, accuracy, error, and consistency statistics.
- Detailed post-test analytics and historical progress charts.
- Customizable themes, fonts, sounds, and typing behaviour.
- User registration, authentication, and cloud-synchronised settings and results.
- Public profiles, leaderboards, and shareable test results.
- Import/export, accessibility, security, and automated testing.

The application must work for anonymous users without requiring an account. Signing in should add synchronisation and social features rather than being required for basic typing tests.

## 2. Scope and prioritisation

### P0 — Core functionality

- Typing engine and keyboard input handling.
- Timed tests: 15, 30, 60, and 120 seconds.
- Word-count tests: 10, 25, 50, and 100 words.
- English word lists with at least two selectable vocabulary sizes.
- Punctuation and numbers toggles.
- Live timer, WPM, raw WPM, and accuracy.
- Character-level correctness feedback.
- Test restart and result screen.
- Local persistence for settings and history.
- Responsive layout and keyboard navigation.

### P1 — Full-featured release

- Multiple language packs and quote-based tests.
- Custom text and configurable test presets.
- Advanced themes, typography, sounds, caret settings, and display preferences.
- Detailed result graphs, character statistics, and consistency metrics.
- Account registration, login, logout, and password recovery.
- Cloud synchronisation of user settings and test history.
- Public user profiles, personal bests, and leaderboards.
- Shareable result links.
- Data export, account deletion, and recovery from sync failures.

### P2 — Advanced features

- Custom word-list management.
- Challenge links that reproduce a test configuration.
- Optional daily challenges.
- Keyboard-layout visualisation and layout-aware practice.
- Personalised weak-character and error-pattern analysis.
- Additional typing modifiers and experimental modes.
- Optional real-time multiplayer challenges.

P2 features must not delay a stable P0/P1 release. Multiplayer, in particular, requires a separate technical design and should not be simulated with unreliable client-side leaderboards.

## 3. Core user journeys

### Journey A: Anonymous typing test

1. Open the home page.
2. See the test text, selected duration, language, and live statistics.
3. Start typing immediately without clicking an input field.
4. Receive immediate character-level feedback.
5. Complete the timer or word count.
6. Review results, charts, and personal bests.
7. Restart or configure another test.

### Journey B: Account and synchronisation

1. Register or sign in.
2. Continue testing without losing locally stored history.
3. Synchronise settings and eligible results.
4. Open the account on another device.
5. View historical results and personal bests.
6. Export personal data or delete the account.

### Journey C: Progress analysis

1. Open the statistics page.
2. Select a date range, language, test mode, or duration.
3. Compare WPM, accuracy, and consistency over time.
4. Inspect individual tests and detailed error statistics.
5. Identify weak areas and choose an appropriate practice mode.

## 4. Functional requirements

### 4.1 Typing engine

Implement the typing engine as a deterministic, testable state machine, separate from UI components.

Required states:

- `idle`: test generated and ready.
- `running`: active typing session.
- `completed`: test finished normally.
- `failed`: test ended because of a configured failure condition.
- `cancelled`: test was explicitly abandoned.

Requirements:

- Support keyboard input without requiring a visible text input to receive focus continuously.
- Correctly handle letters, numbers, punctuation, spaces, backspace, and supported keyboard layouts.
- Ignore unrelated shortcuts and browser-reserved keys where appropriate.
- Handle repeated key events, rapid input, and accidental focus loss.
- Prevent unintended page scrolling during supported typing shortcuts.
- Use a monotonic clock for elapsed-time calculations.
- Ensure each test has a unique ID and a reproducible configuration.
- Keep input handling, test generation, statistics, persistence, and rendering logically separated.
- Support restart without retaining stale timers, listeners, or results.
- Show errors immediately and allow correction according to the configured mode.
- Handle text composition and international input using browser composition events rather than assuming every character is produced by one keypress.
- Provide a documented policy for unsupported input methods and keyboard layouts.

Do not use React render frequency as the timing source. Do not assume that one `keydown` event equals one committed character.

### 4.2 Test configuration

Every test must have a serialisable configuration containing:

- Test mode: timed, word count, quote, or custom text.
- Duration or target word count.
- Language and vocabulary set.
- Punctuation and numbers settings.
- Difficulty or error-handling mode.
- Relevant display and input options.
- Random seed or generated prompt identifier when reproducibility is required.

Changing configuration before a test must not corrupt an active or completed test.

### 4.3 Statistics definitions

All formulas must be implemented in a shared statistics module and covered by automated tests.

Use the following documented baseline:

- **Elapsed time:** monotonic elapsed milliseconds, capped at the configured duration for timed tests.
- **Gross WPM / raw WPM:** total committed characters divided by five, normalised to one minute.
- **Net WPM:** correctly typed characters divided by five, normalised to one minute.
- **Accuracy:** correct character attempts divided by all scored character attempts, expressed as a percentage.
- **Character statistics:** counts of correct, incorrect, extra, and missed characters, with a documented treatment of corrected mistakes.
- **Consistency:** a defined metric derived from speed variation across fixed time intervals. Document the formula and edge cases.
- **Best result:** compare scores only within compatible test categories and configurations.

For example:

WPM = (scored characters / 5) / elapsed minutes

These are the initial product definitions, not a claim that every formula exactly matches Monkeytype. Final scoring rules must be consistent across live displays, results, history, and leaderboards.

Handle zero elapsed time, no-input sessions, partial final intervals, early termination, and incomplete words explicitly. Do not divide by zero or display misleading infinite values.

### 4.4 Results screen

After each completed test, display:

- Net WPM and raw WPM.
- Accuracy.
- Test duration or completed word count.
- Correct, incorrect, extra, and missed character counts.
- Speed-over-time chart.
- Optional raw-speed chart.
- Consistency score with a clear definition.
- Personal-best comparison.
- Test configuration and timestamp.
- Restart, share, and detailed-analysis actions.

Results must remain accessible after refresh when persistence is enabled.

### 4.5 Settings and themes

Provide configurable options for:

- Theme and custom colour palette.
- Light and dark appearance.
- Font family, size, and text width.
- Caret style and animation.
- Sound effects and volume.
- Live statistics visibility.
- Error highlighting and correction behaviour.
- Quick restart shortcuts.
- Test defaults and language.
- Reduced-motion preference.

Settings must be validated, persisted, and restorable to defaults. Provide JSON settings export/import with schema validation.

### 4.6 History and analytics

- Store each completed test with its configuration and scoring version.
- Filter history by date, mode, language, and duration.
- Display WPM and accuracy trends.
- Show personal bests per compatible category.
- Support pagination or incremental loading for large histories.
- Allow exporting history in JSON and CSV formats.
- Do not silently discard history when the user changes settings.
- Provide a clear distinction between local and cloud-synchronised records.

### 4.7 Authentication and profiles

Support:

- Registration and login.
- Secure session handling.
- Password reset.
- Account settings and profile visibility.
- Public or private profile configuration.
- Cloud settings synchronisation.
- History synchronisation and duplicate prevention.
- Account deletion and personal-data export.

Anonymous usage must continue if authentication or the cloud service is temporarily unavailable.

### 4.8 Leaderboards and sharing

Leaderboards must be generated from server-validated records, not trusted client submissions alone.

- Define supported leaderboard categories and ranking rules.
- Reject malformed, impossible, or incomplete results.
- Rate-limit submissions and authentication-sensitive endpoints.
- Make ranking eligibility and privacy rules clear.
- Provide stable shareable result URLs.
- Prevent private profile data from leaking into public pages.
- Do not claim that client-side anti-cheat checks make scores tamper-proof.

## 5. Technical architecture

Use a modular architecture that remains understandable to an AI coding agent.

### Frontend

- React
- TypeScript with strict type checking
- Vite
- Tailwind CSS
- React Router or an equivalent lightweight routing solution
- A maintained charting library
- Vitest and React Testing Library
- Playwright for end-to-end tests

### Backend and database

Preferred default: Supabase.

- PostgreSQL for user records, test history, and leaderboard queries.
- Supabase Auth for authentication.
- Row Level Security for user-owned records.
- Server-side functions for leaderboard validation and other privileged operations.
- Database migrations committed to version control.

Do not expose service-role credentials in the browser. Public environment variables must contain only credentials designed for public client use.

### Persistence strategy

- LocalStorage: lightweight preferences and anonymous-user metadata.
- IndexedDB: larger local test histories and queued sync operations if needed.
- PostgreSQL: authenticated users' cloud records and leaderboard data.
- Cloud sync: idempotent operations with clear conflict-resolution rules.

Use a repository/data-access layer so the typing engine does not depend directly on Supabase.

### Deployment

- Deploy the frontend to a suitable static hosting platform.
- Use managed backend services where possible.
- Configure preview deployments and production environments separately.
- Keep secrets in environment variables or platform secret storage.
- Provide a reproducible local development setup.

Do not introduce a custom server, Redis, background workers, or microservices unless a demonstrated requirement justifies the added complexity.

## 6. Initial data model

Define migrations and TypeScript types for at least these entities:

### profiles

- `id`
- `username`
- `display_name`
- `avatar_url`
- `visibility`
- `created_at`
- `updated_at`

### test_results

- `id`
- `user_id`, nullable for anonymous local records
- `client_test_id`
- `test_mode`
- `language`
- `configuration`
- `prompt_id` or prompt reference
- `duration_ms`
- `word_count`
- `net_wpm`
- `raw_wpm`
- `accuracy`
- `character_statistics`
- `consistency`
- `scoring_version`
- `completed_at`
- `created_at`

### user_settings

- `user_id`
- `settings_json`
- `schema_version`
- `updated_at`

### leaderboard_entries

Create only if needed for performance. Otherwise derive leaderboard results from validated test records.

- `id`
- `user_id`
- `category_key`
- `test_result_id`
- `score`
- `created_at`

Add appropriate foreign keys, indexes, constraints, uniqueness rules, and RLS policies. Do not store credentials or unnecessary personal information in profile records.

## 7. Quality requirements

### Performance

- The typing loop must remain responsive during fast input.
- Avoid unnecessary component-wide re-renders for each character.
- Keep animations lightweight and respect reduced-motion settings.
- Load history and charts lazily when practical.
- Set a project target of less than 100 ms p95 interaction processing time on a representative desktop test environment.
- Establish and measure a production bundle budget before release.

### Compatibility

- Support current stable Chrome, Edge, Firefox, and Safari where practical.
- Support desktop keyboard use and responsive mobile layouts.
- Treat mobile virtual keyboards as a separately tested input path.
- Handle browser refresh, focus changes, and temporary network loss.

### Accessibility

- Keyboard-accessible settings and navigation.
- Visible focus states.
- Sufficient contrast across themes.
- Screen-reader labels for controls and charts.
- Reduced-motion support.
- Do not rely on colour alone to communicate typing errors.

### Security and privacy

- Validate all server-bound inputs.
- Enforce database access policies.
- Prevent cross-user access to private records.
- Protect authentication and mutation endpoints with appropriate rate limits.
- Never commit secrets, credentials, or real user data.
- Implement account deletion and export.
- Minimise analytics and third-party tracking.
- Document data retention and public-profile behaviour.

### Reliability

- No uncaught errors during ordinary test flows.
- No duplicate test submissions caused by retries.
- No stale timers after restarting or navigating away.
- Graceful degradation during cloud outages.
- Clear handling of failed synchronisation and conflicting updates.

## 8. Testing strategy

### Unit tests

Cover:

- WPM, raw WPM, accuracy, consistency, and character statistics.
- Timer boundaries and elapsed-time calculations.
- Test state transitions.
- Backspace and correction rules.
- Word generation and configuration validation.
- Result serialisation and deserialisation.
- Settings migrations and validation.

### Integration tests

Cover:

- Typing engine and UI state consistency.
- Local persistence and recovery.
- Authentication and database policies.
- History synchronisation and duplicate prevention.
- Leaderboard eligibility.
- Import/export behaviour.

### End-to-end tests

At minimum:

1. Complete a timed test.
2. Complete a word-count test.
3. Correct an error using backspace.
4. Restart before completion.
5. Complete a test at the timer boundary.
6. Refresh and recover local settings and history.
7. Register, sign in, and sign out.
8. Synchronise history across sessions.
9. Verify that one user cannot access another user's private data.
10. Export history and import valid settings.
11. Verify responsive layouts and keyboard navigation.
12. Verify that failed network requests do not corrupt local results.

Use deterministic test prompts and an injectable clock for timing-sensitive tests.

## 9. Delivery phases

### Phase 0 — Repository and design audit

Inspect the existing repository, installed dependencies, deployment setup, and available tests.

Deliverables:
- Architecture proposal.
- Feature checklist.
- Data model and migrations plan.
- Risk register.
- Implementation plan.

Do not overwrite an existing project or introduce a new stack without first explaining why it is necessary.

### Phase 1 — Functional MVP

Implement the typing engine, core modes, metrics, result screen, basic themes, and local persistence.

Exit criteria:
- All core unit tests pass.
- Core typing journeys pass in a real browser.
- No known critical input or timer bugs.

### Phase 2 — Advanced typing features

Add quotes, custom text, additional languages, configurable behaviour, themes, detailed statistics, and history analytics.

Exit criteria:
- Configuration changes behave consistently.
- Historical results use explicit scoring versions.
- Regression tests cover all supported test modes.

### Phase 3 — Accounts and cloud services

Implement authentication, profiles, database policies, history synchronisation, and personal bests.

Exit criteria:
- Cross-user isolation is verified.
- Sync retries do not create duplicates.
- Local usage continues during service outages.

### Phase 4 — Leaderboards and production hardening

Implement server-side score validation, public profiles, share links, rate limiting, accessibility checks, and deployment monitoring.

Exit criteria:
- End-to-end tests pass.
- No unresolved critical security issues.
- Production build and database migrations are reproducible.
- Known limitations are documented.

### Phase 5 — Optional advanced modes

Implement challenges, personalised practice, additional keyboard layouts, and multiplayer only after the previous phases are stable.

## 10. Definition of done

A feature is complete only when:

- Its requirements and edge cases are documented.
- Its implementation is type-safe.
- Relevant unit and integration tests pass.
- The feature has been verified in a browser.
- Loading, error, empty, and offline states are handled where applicable.
- Accessibility and security implications have been checked.
- Documentation and migrations are updated.
- The code is committed in a coherent change.
- No unrelated functionality has regressed.

The agent must report what it actually implemented, what it tested, the test results, any known limitations, and any manual verification still required.

## 11. Explicit non-goals

- Copying Monkeytype's branding, logo, or proprietary visual assets.
- Claiming complete feature parity without a verified feature inventory.
- Trusting client-generated scores for public ranking.
- Adding AI inference to the runtime without a concrete user benefit.
- Introducing unnecessary infrastructure before it is needed.
- Implementing multiplayer before the core platform is reliable.

The product may use Monkeytype as a behavioural and UX reference, but it should have its own name, visual identity, and original implementation.

## 12. Agent operating rules

1. Inspect the repository and current project state before editing files.
2. Maintain a project-level implementation checklist.
3. Work in small, independently testable phases.
4. Write or update tests alongside implementation.
5. Run type checking, linting, unit tests, and relevant build checks before declaring a phase complete.
6. Never claim a test passed unless it was actually executed and its result observed.
7. Do not replace working functionality merely to simplify the architecture.
8. Ask before destructive operations, paid-service activation, or irreversible production changes.
9. Document important architectural decisions in `docs/decisions/`.
10. Keep `README.md`, `.env.example`, and setup instructions current.
11. Use mock data for development and never commit real credentials.
12. If a requirement is ambiguous, state the proposed interpretation and its consequences before implementing a major architectural decision.
