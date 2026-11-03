# UI primitive rollout - design

Status: approved.

## Intent

Finish the design-system work started in `ec5d128`. Settings and History already use the first
primitives, but the rest of the app still hand-writes the same buttons, cards, metrics, micro-labels,
inputs, and status messages. This change completes the rollout so future surface work composes from
one vocabulary instead of copying class strings.

The work is a refactor. It does not change product behaviour, copy, layout structure, scoring,
persistence, or the visual identity.

## Goals

- Replace the remaining hand-written buttons and links with `Button` or `buttonStyles`.
- Replace repeated card shells with `Card`, including the `<section>` cards in Settings panels.
- Make `Metric` valid inside `<dl>` and reuse it everywhere a metric is rendered.
- Add one `HeroStat` for the large Net WPM block that appears three times.
- Add `Overline` for the mono micro-label that appears about a dozen times with drifting sizes and
  tracking.
- Add `Input`, `Select`, and `Textarea` with one shared control treatment.
- Add `StatusMessage` for inline info, success, and error output, with correct `role` per tone.
- Extend `Button` with a large size and `ChoiceButton` with tone and size so the toolbar's solid and
  soft variants are expressible without local copies.
- Give `ConfirmDialog` a focus trap, focus restore, and a described-by link.
- Add semantic radius usage so inputs and notes stop mixing `rounded-xl` with the card radius.

## Non-goals

- No visual redesign. Existing spacing, colours, type sizes, and layouts stay as they are.
- No new pages, features, copy, or interaction changes.
- No toast system. The app's status output is inline and stays inline.
- No command palette, results hero redesign, chart work, or animation work.
- No changes to `TypingSurface`, the typing engine, scoring, history repository, settings schema, or
  share format.
- No new runtime dependency. `cn()` stays the only class helper.

## Anti-goals

- A refactor that changes what a test renders, beyond markup inside an existing test id.
- A primitive whose `className` silently loses a colour or spacing rule to class-order luck.
- A `Metric` that renders invalid markup inside a `<dl>`.
- A dialog that traps focus but cannot restore it to the trigger.
- A bundle increase above a couple of kilobytes gzip.
- A half-migrated surface that mixes the old and new treatment in one row.

## Constraints

- React 19, TypeScript with `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
  `erasableSyntaxOnly`, and `noUnusedLocals`.
- `react-refresh/only-export-components` with zero warnings. Shared style functions live in
  `src/components/ui/styles.ts`, not in component files.
- Tailwind v4 with tokens in `src/styles/tokens.css`. No `tailwind-merge`; `cn()` joins only.
- Bundle budgets: entry JS 160 kB, all JS 340 kB, CSS 16 kB gzip. Current measured headroom after
  `ec5d128`: 26.2 kB entry, 60.1 kB all JS, 9.2 kB CSS.
- Strict CSP. No external fonts or images. Unchanged.
- Existing tests must pass without weakening assertions. Where markup moves, update the locator, not
  the expectation.

## Approaches considered

1. **Single sweep (not chosen).** One commit covering primitives and every surface. Fastest, but a
   large diff and no independently deployable step. A regression would be hard to attribute.
2. **Three green commits (chosen).** Primitives and their tests first, then the bench and result
   surfaces, then the pages and panels. Each commit runs the full gate and deploys. Shared files
   change once per commit, and a regression is attributable to one diff.
3. **Minimal consistency pass (not chosen).** Only Buttons, Cards, and Metrics. Smallest diff, but
   leaves the micro-label drift, the five different status treatments, the inconsistent inputs, and
   the dialog focus bug, which is where the real inconsistency is.

## What gets built

### Commit 1: primitives

Add or extend, with focused tests:

- `Overline` in `src/components/ui/Overline.tsx`. Renders a `<span>` with the shared mono, uppercase,
  wide-tracking treatment. Two tones: muted (default) and accent. A single `<span>` works inside
  `<p>`, `<legend>`, `<label>`, `<dt>`, and flex rows, so no polymorphic API is needed.
- `StatusMessage` in `src/components/ui/StatusMessage.tsx`. Props: `tone` (`info` | `success` |
  `error`), optional `details` list, optional `className`. Tone controls colour, border, and
  `role` (`alert` for error, `status` otherwise).
- `Input`, `Select`, and `Textarea` in `src/components/ui/controls.tsx`, built on a shared
  `controlStyles()` export in `styles.ts`. Native elements, forwarded props, one size. Invalid state
  is expressed by the caller through `aria-invalid`, not a separate visual prop.
- `Metric` reworked to render `<div><dt/><dd/></div>` with `size` (`sm` | `md`, default `md`).
  Callers must place it inside a `<dl>`. This fixes the current invalid `<p>` inside `<dl>`.
- `HeroStat` in the same file as `Metric`. Renders the `dt`/`dd` pair for the large value, with an
  optional caption and an optional `valueTestId`.
- `Button` gains `size="lg"`.
- `ChoiceButton` gains `tone` (`solid` | `soft`) and `size` (`sm` | `md`). `solid` is the current
  default; `soft` is the toolbar option treatment. `ChoiceGroup` gains `frame` (`soft` | `outline` |
  `none`, default `soft`) so both existing frames are expressible.
- `Card` gains `as="section"` so the Settings panels keep their section semantics. Card class string
  is exported as `cardStyles()`.
- `ConfirmDialog` adds a focus trap, restores focus to the previously active element on close, and
  wires `aria-describedby`. Escape and backdrop cancel stay as they are.
- Add a semantic radius token, `--radius-control`, mapped as `rounded-control`, for inputs and
  inline notes. Pill stays for controls; `rounded-card` stays for surfaces.

Commit 1 also updates `HistoryPage` only as far as needed for the new `Metric` markup: its metric
grid becomes a `<dl>` and nothing else changes.

Tests added: `Overline` tones and element, `StatusMessage` roles and detail list, `Metric`/`HeroStat`
markup, control prop forwarding and disabled styling, `ChoiceButton` tone and size, `Card` section
element, and `ConfirmDialog` tab cycling, Escape, restore focus, and described-by wiring.

### Commit 2: bench and result surfaces

- `TestToolbar`: mode group and duration/word-count groups use `ChoiceGroup` and `ChoiceButton`.
  Vocabulary uses `Select`. Restart uses `Button` with an icon. Preset chips use `Button` size `sm`,
  variant `secondary`. The `displayMode` override and every callback stay identical.
- `CustomTextPanel`: `Textarea`, `Button` (primary and secondary), `StatusMessage` for the
  over-limit alert.
- `ResultPanel`: `HeroStat`, `Metric` sizes, `Button` with icons, `buttonStyles` for the Ctrl+Enter
  hint row, and `StatusMessage` tone `info` for flags.
- `SharePanel`: `Card` as a section, `Overline` for the share label and unranked badge, `Button` for
  every action, `Input` for the read-only link, `StatusMessage` for copy and download outcomes.

All local `Metric` and `SmallMetric` functions in these files are deleted.

### Commit 3: pages and panels

- `HomePage`: `Card` for the loading bench, `buttonStyles` for the field-notes link.
- `ResultDetailPage` and `SharedResultPage`: `HeroStat`, `Metric`, `buttonStyles` for the link
  pairs, `Overline` for the Net WPM label. Local metric functions are deleted.
- `StoragePanel`: `Card` as a section, `Button` for every cleanup action, `StatusMessage` for read
  and delete errors plus the busy line, `Overline` for the summary label.
- `BackupPanel`: `Card` as a section, `Button` for export, import, confirm, and cancel, `StatusMessage`
  for every message kind including the issue list, `rounded-control` for the pending-import box.
  The file input label reuses `buttonStyles` with a disabled state.
- `AppLayout`: nav pills use `buttonStyles` with `primary` when active and `ghost` otherwise. The
  settings banner keeps its dismiss button and uses `StatusMessage` for the message row.

## Class-override rule

Primitives expose variants for colour, size, and tone. `className` is for layout only: margins,
grid placement, width, and alignment. If a surface needs a different colour or radius, the primitive
gains a variant. This avoids relying on Tailwind class order, since `cn()` does not merge.

## Testing

Each commit runs the full local gate before push: `npm run typecheck`, `npm run lint`,
`npm run format:check`, `npm test`, `npm run build`, `npm run check:bundle`, and `npm run test:e2e`.

Refactor-specific checks:

- No existing test assertion is weakened. Locators may change only where the element type changed.
- `HistoryPage`, `SettingsPage`, `ResultDetailPage`, `SharedResultPage`, `SharePanel`,
  `BackupPanel`, and `StoragePanel` suites pass with the same behavioural expectations.
- The axe smoke test still passes on every route.
- The dialog suite covers forward and backward tab wrapping, Escape, backdrop click, and focus
  restore.
- Bundle stays within budget after each commit. Expected growth is under 2 kB all JS.

## Rollout

- Three commits on `main`, in order. CI gates each push; Cloudflare Pages deploys after CI passes.
- After each deploy, smoke the live site on the surfaces that commit touched.
- If a commit regresses, revert that commit only. The earlier primitives or surfaces stay usable.

## Risks

- **Overriding by class order.** Mitigated by the class-override rule and by using variants for every
  colour difference found in the audit.
- **Metric markup change.** `Metric` becomes invalid outside a `<dl>`. Every call site is migrated in
  the same commit that changes it, and commit 1 updates `HistoryPage` alongside.
- **Focus trap edge cases.** A trap that mishandles Shift+Tab or restore is worse than none. Covered
  by direct tests before any surface uses it.
- **Hidden visual drift.** Moving class strings can change specificity or ordering. The e2e suite,
  axe, and a before/after check on each touched page are the guard.
- **Test churn.** Some tests query by role or text. Markup changes may require locator updates. The
  rule is to change the locator, never the expectation.

## Left to the builder

- Exact variant and token names within the described API.
- The precise class strings, provided no visual change results.
- Whether `HeroStat` lives in `Metric.tsx` or its own file.
- The number and granularity of primitive tests.
- Whether the AppLayout banner uses `StatusMessage` directly or keeps its own wrapper for the dismiss
  control.
