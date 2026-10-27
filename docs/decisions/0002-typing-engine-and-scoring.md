# ADR 0002 — Typing Engine, Input Handling, and Scoring

- **Status:** Proposed
- **Date:** 2026-10-27
- **Deciders:** Product owner, implementation agent
- **Related:** [Architecture](../phase-0/01-architecture.md#5-typing-engine), [Data model](../phase-0/03-data-model.md)

## Context

The specification requires a deterministic, testable typing engine separate from UI components; support for timed and word-count tests; composition/IME input; a monotonic clock; restart safety; character-level feedback; and documented WPM, accuracy, consistency, and character statistics.

A naive implementation that stores typed text in React state and derives timing from renders will fail on fast input, background tabs, IME, and restart. Scoring formulas that are spread across components will drift between live stats, results, and history.

## Decision

### Engine

- Implement a pure TypeScript state machine in `src/engine/`.
- States: `idle`, `running`, `completed`, `failed`, `cancelled`.
- The engine owns typed state, elapsed time, attempts, and the frozen result.
- The engine accepts semantic input: `insert(text)`, `backspace()`, `cancel()`, `tick(now)`.
- The clock is injected; production uses `performance.now()`.
- The engine checks elapsed time on input and on ticks, so throttled rAF cannot extend a timed test.
- Timed elapsed is capped at the configured duration; word-test completion uses the final commit timestamp.
- Restart creates a new test ID and disposes the ticker and listeners.

### Input

- Use a visually hidden but focusable `<textarea>` as the input receptor.
- Commit text from `input`/`beforeinput` and composition events, not from `keydown` alone.
- Handle composition explicitly; ignore `input` during composition and commit once on `compositionend`.
- Prevent space/backspace page scrolling; ignore modifier shortcuts; never trap Tab.
- Interpret committed characters, not physical key codes, so keyboard layouts work.
- Document unsupported input (RTL test content, emoji, complex graphemes, webviews without input events).

### Rendering

- Expose the engine through an external store and `useSyncExternalStore` selectors.
- Memoise words; update only the active word on a keystroke.
- Quantise live stats to ~10 Hz; use rAF only to drive the ticker, never as the timing source.

### Scoring

- One versioned module, initial version `1.0.0`.
- Net WPM = `(finalCorrect + correctSeparators) / 5 / max(elapsedMs, 1000) * 60000`.
- Raw WPM = final committed characters (correct + incorrect + extra + separators) / 5 / minutes.
- Accuracy = correct attempts / all attempts × 100; corrected mistakes remain penalised.
- Character statistics describe the final text; accuracy describes attempts.
- Consistency = `clamp(0, 100, 100 * (1 - coefficientOfVariation))` over 1-second WPM buckets, including a final partial bucket only if ≥500 ms.
- Zero attempts → 0% accuracy and `no-input`; elapsed <1 s → 1 s scoring floor and `under-one-second`; never `NaN`/`Infinity`.
- Every result persists `scoringVersion`; no retroactive rescoring.

## Consequences

**Positive**

- Engine and scoring are unit-testable without a browser.
- UI performance is decoupled from domain correctness.
- IME/mobile input has one normalisation path.
- Historical scores remain interpretable.

**Negative / trade-offs**

- The hidden-textarea adapter is fiddly; it needs real-browser tests and a documented support matrix.
- Counting separator spaces means WPM differs slightly from tools that ignore spaces.
- Accuracy and final character statistics intentionally tell different stories; the UI must explain this.
- Consistency is sensitive on very short tests; short results are excluded from personal bests.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| `keydown`-only input | Fails IME, dead keys, mobile keyboards, autocorrect |
| React state as the engine | Re-render frequency becomes the timing source; poor performance |
| Wall-clock timing (`Date.now`) | Susceptible to system clock changes |
| Per-component scoring | Guaranteed drift between live, result, and history values |
| Recompute old results with new formulas | Destroys historical comparability |

## Follow-ups

- [ ] Implement and test the adapter in Chrome, Firefox, Safari, iOS, and Android.
- [ ] Add fixture tests for every scoring edge case.
- [ ] Publish the scoring and unsupported-input docs with the Phase 1 release.
