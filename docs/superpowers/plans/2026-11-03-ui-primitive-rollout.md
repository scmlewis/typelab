# UI Primitive Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the UI primitive rollout so the remaining surfaces compose from one set of components without changing product behaviour or visual identity.

**Architecture:** Extend `src/components/ui/` with the missing primitives and variants, then migrate the bench and result surfaces, then the pages and settings panels. Three commits, each independently testable and deployable.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Vitest, React Testing Library, user-event, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-03-ui-primitive-rollout-design.md`

## Global Constraints

- Refactor only. No behaviour, copy, layout structure, scoring, persistence, or share-format change.
- No new runtime dependency. `cn()` remains the only class helper.
- Tailwind classes: primitives expose variants for colour, size, and tone. `className` is for layout only (margin, grid placement, width, alignment).
- `react-refresh/only-export-components` with zero warnings. Style functions live in `src/components/ui/styles.ts`.
- TypeScript uses `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `erasableSyntaxOnly`, `noUnusedLocals`.
- Bundle budgets: entry JS 160 kB, all JS 340 kB, CSS 16 kB gzip. Expected growth under 2 kB all JS.
- Every task ends with its own tests and commit. Full gate before push: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`, `npm run check:bundle`, `npm run test:e2e`.
- Existing test assertions are not weakened. Locators may change only where the element type changed.
- No em-dashes in new user-facing copy. This plan adds no copy.

## Review Focus

- **Metric markup inside `<dl>`:** every `Metric` and `HeroStat` must render a `dt` with a matching `dd`, and no `<p>` may sit directly inside a `<dl>`. Pinned in Task 1.
- **Dialog focus restore when the trigger disappears:** deleting a row removes the trigger before the dialog closes. Restore must no-op safely instead of throwing. Pinned in Task 1.
- **Status roles:** an error must be `role="alert"`; info and success must be `role="status"`. Screen readers must not miss a failure or announce routine state as an alert. Pinned in Task 1.
- **Disabled and pressed state after the toolbar refactor:** every mode, duration, word-count, and modifier control must stay disabled during a run and keep `aria-pressed`. Pinned in Task 2.
- **Class override drift:** no surface may pass a colour, radius, or padding class to a primitive to fight its variant. Pinned by the grep step in Tasks 2 and 3.

---

### Task 1: Primitives and dialog hardening

**Files:**
- Create: `src/components/ui/Overline.tsx`
- Create: `src/components/ui/StatusMessage.tsx`
- Create: `src/components/ui/controls.tsx`
- Create: `src/components/ui/primitives.test.tsx`
- Create: `src/components/ui/ConfirmDialog.test.tsx`
- Modify: `src/styles/tokens.css`
- Modify: `src/components/ui/styles.ts`
- Modify: `src/components/ui/Choice.tsx`
- Modify: `src/components/ui/Card.tsx`
- Modify: `src/components/ui/Metric.tsx`
- Modify: `src/components/ui/ConfirmDialog.tsx`
- Modify: `src/app/pages/HistoryPage.tsx` (metric container only)
- Modify: `docs/superpowers/specs/2026-11-03-ui-primitive-rollout-design.md` (status line)
- Add: `docs/superpowers/plans/2026-11-03-ui-primitive-rollout.md`

**Interfaces:**
- Produces:
  - `Overline({ children: ReactNode; tone?: 'muted' | 'accent'; className?: string })`
  - `StatusMessage({ tone?: 'info' | 'success' | 'error'; variant?: 'box' | 'plain'; details?: readonly string[] | undefined; className?: string; children: ReactNode })`
  - `Input`, `Select`, `Textarea` as `ComponentProps<'input' | 'select' | 'textarea'>` plus `density?: 'sm' | 'md' | undefined`
  - `Metric({ label: string; value: ReactNode; size?: 'sm' | 'md'; className?: string })`
  - `HeroStat({ label: string; value: string; caption?: ReactNode | undefined; valueTestId?: string | undefined; className?: string })`
  - `cardStyles({ padding?: 'default' | 'roomy'; className?: string }): string`
  - `controlStyles({ density?: 'sm' | 'md'; className?: string }): string`
  - `buttonStyles` gains `weight?: 'normal' | 'medium'`; `ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'link' | 'compact'`
  - `ChoiceTone = 'solid' | 'soft'`, `ChoiceSize = 'xs' | 'sm' | 'md'`, `ChoiceFrame = 'none' | 'soft' | 'outline'`
  - `ChoiceGroup({ frame?: ChoiceFrame })` (replaces `padded`; defaults `none`)
  - `SegmentedControl<T>({ frame?: ChoiceFrame; tone?: ChoiceTone; size?: ChoiceSize })` (defaults `soft`, `solid`, `sm`)
  - `Card({ as?: 'div' | 'section'; padding?: 'default' | 'roomy' })` plus a `data-*` index signature so `data-testid` is accepted

- [ ] **Step 1: Write failing tests for `Overline` and `StatusMessage`**

Append to `src/components/ui/primitives.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Overline } from '@/components/ui/Overline';
import { StatusMessage } from '@/components/ui/StatusMessage';

describe('Overline', () => {
  it('renders a muted mono span by default', () => {
    render(<Overline>Net WPM</Overline>);
    const label = screen.getByText('Net WPM');
    expect(label.tagName).toBe('SPAN');
    expect(label).toHaveClass('font-mono', 'uppercase', 'text-ink-muted');
  });

  it('uses accent when asked', () => {
    render(<Overline tone="accent">Share</Overline>);
    expect(screen.getByText('Share')).toHaveClass('text-accent');
  });
});

describe('StatusMessage', () => {
  it('announces errors as alerts and lists details', () => {
    render(
      <StatusMessage details={['Row 2: bad id', 'Row 5: missing score']} tone="error">
        Import failed.
      </StatusMessage>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Import failed.');
    expect(screen.getByText('Row 2: bad id')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('text-danger');
  });

  it('announces info as status without a box when plain', () => {
    render(
      <StatusMessage tone="info" variant="plain">
        Deleted 1 run.
      </StatusMessage>,
    );
    const message = screen.getByRole('status');
    expect(message).toHaveTextContent('Deleted 1 run.');
    expect(message).not.toHaveClass('border');
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run src/components/ui/primitives.test.tsx`
Expected: FAIL, modules `Overline` and `StatusMessage` cannot be resolved.

- [ ] **Step 3: Implement `Overline` and `StatusMessage`**

`Overline` renders a `<span>` with `font-mono text-[0.65rem] uppercase tracking-[0.16em]` plus `text-accent` or `text-ink-muted`.

`StatusMessage` returns a `<div role={tone === 'error' ? 'alert' : 'status'}>` with:

- base `text-xs leading-5`
- tone text: `info` -> `text-ink-muted`, `success` -> `text-ink`, `error` -> `text-danger`
- `box` variant adds `rounded-control border px-4 py-3` plus `border-danger/30 bg-danger/5` for error and `border-line/80 bg-accent-soft/40` otherwise
- `details` renders `<ul className="mt-2 space-y-1">` with one `<li>` per entry

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npx vitest run src/components/ui/primitives.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write failing tests for `Metric`, `HeroStat`, `Card`, `ChoiceButton`, and controls**

Add the missing imports to the top of the same file and append these tests:

```tsx
import { Card } from '@/components/ui/Card';
import { ChoiceButton } from '@/components/ui/Choice';
import { Input, Select, Textarea } from '@/components/ui/controls';
import { HeroStat, Metric } from '@/components/ui/Metric';

it('renders Metric as dt and dd inside a dl', () => {
  render(
    <dl>
      <Metric label="Raw WPM" value="81.2" />
    </dl>,
  );
  expect(screen.getByText('Raw WPM').tagName).toBe('DT');
  expect(screen.getByText('81.2').tagName).toBe('DD');
});

it('renders the small Metric size', () => {
  render(
    <dl>
      <Metric label="Correct" size="sm" value={420} />
    </dl>,
  );
  expect(screen.getByText('Correct')).toHaveClass('text-xs');
  expect(screen.getByText('420')).toHaveClass('text-sm');
});

it('renders HeroStat with a test id', () => {
  render(
    <dl>
      <HeroStat label="Net WPM" value="72" valueTestId="hero-value" />
    </dl>,
  );
  expect(screen.getByTestId('hero-value')).toHaveTextContent('72');
  expect(screen.getByText('Net WPM').tagName).toBe('DT');
});

it('renders Card as a section with roomy padding', () => {
  render(<Card as="section" aria-label="Storage" padding="roomy" />);
  const card = screen.getByLabelText('Storage');
  expect(card.tagName).toBe('SECTION');
  expect(card).toHaveClass('p-8');
});

it('expresses soft choice tone and size', () => {
  render(
    <ChoiceButton active size="xs" tone="soft">
      15
    </ChoiceButton>,
  );
  const button = screen.getByRole('button', { name: '15' });
  expect(button).toHaveAttribute('aria-pressed', 'true');
  expect(button).toHaveClass('bg-accent-soft');
});

it('forwards native control props and the control radius', () => {
  render(
    <>
      <Input aria-label="Link" density="sm" readOnly value="https://example.com" />
      <Select aria-label="Vocabulary" defaultValue="english-200" density="sm">
        <option value="english-200">Top 200</option>
      </Select>
      <Textarea aria-label="Text" rows={3} />
    </>,
  );
  expect(screen.getByLabelText('Link')).toHaveClass('rounded-control');
  expect(screen.getByLabelText('Vocabulary')).toHaveValue('english-200');
  expect(screen.getByLabelText('Text').tagName).toBe('TEXTAREA');
});
```

- [ ] **Step 6: Run the tests to confirm they fail**

Run: `npx vitest run src/components/ui/primitives.test.tsx`
Expected: FAIL on missing exports and on `Metric` not rendering `DT`.

- [ ] **Step 7: Implement `Metric`, `HeroStat`, controls, `Card`, and `Choice` variants**

`Metric` renders `<div><dt/><dd/></div>`. Default size `md`: `dt` is `font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-muted`, `dd` is `mt-1 font-mono text-xl tabular-nums text-ink`. Size `sm`: `dt` is `text-xs text-ink-muted`, `dd` is `font-mono text-sm tabular-nums text-ink`. The wrapper is `flex items-baseline justify-between gap-3 sm:block` so History keeps its row layout.

`HeroStat` renders `<div className="sm:text-right"><dt><Overline>{label}</Overline></dt><dd className="font-mono text-6xl leading-none tabular-nums text-ink" data-testid={valueTestId}>{value}</dd>{caption ? <dd className="mt-2 text-sm text-ink-muted">{caption}</dd> : null}</div>`. `valueTestId` is spread conditionally so `exactOptionalPropertyTypes` stays satisfied.

`controls.tsx` exports `Input`, `Select`, `Textarea`, each `({ className, density = 'md', ...props }: ComponentProps<'input'> & { density?: 'sm' | 'md' })` returning the native element with `controlStyles({ density, className })`.

`controlStyles` in `styles.ts`:

```ts
const CONTROL_BASE =
  'w-full rounded-control border border-line bg-paper text-ink outline-none transition-colors placeholder:text-ink-muted focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/30 disabled:cursor-not-allowed disabled:opacity-50';
const CONTROL_DENSITIES = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' };
```

`cardStyles({ padding = 'default' })` returns `rounded-card border border-line bg-surface shadow-card` plus `p-5 sm:p-6` or `p-8`. `Card` uses `createElement(as, { ...props, className: cardStyles({ padding, className }) })`. Its props type is `HTMLAttributes<HTMLElement> & { as?: 'div' | 'section'; padding?: 'default' | 'roomy'; [key: \`data-${string}\`]: unknown }`.

`buttonStyles` moves `font-medium` out of the base into `BUTTON_WEIGHTS = { normal: 'font-normal', medium: 'font-medium' }`, default `medium`. Add `link: 'px-3 py-1.5 text-sm'` and `compact: 'p-2.5 text-xs sm:px-3.5 sm:py-1.5'` to the sizes.

`ChoiceButton` gains tone and size. `solid` active `bg-ink text-paper`, inactive `text-ink-muted hover:bg-surface-strong hover:text-ink`. `soft` active `border border-transparent bg-accent-soft text-ink`, inactive `border border-line/80 text-ink-muted hover:bg-surface-strong hover:text-ink`. Sizes: `xs` `px-2 py-2 font-mono text-xs sm:px-2.5 sm:py-1`, `sm` `px-3 py-1.5 font-mono text-xs`, `md` `px-3.5 py-2 text-xs font-medium sm:px-3 sm:py-1.5`. Defaults stay `solid` and `sm`.

`ChoiceGroup` replaces `padded` with `frame`: `none` adds nothing, `soft` adds `rounded-full border border-line bg-surface-strong/50 p-0.5`, `outline` adds `rounded-full border border-line bg-surface/70 p-0.5`. `SegmentedControl` forwards `frame`, `tone`, `size` with defaults `soft`, `solid`, `sm`, so `SettingsPage` needs no change.

Add `--radius-control: 0.75rem;` to `:root` and `--radius-control: var(--radius-control);` to `@theme inline`, so `rounded-control` resolves.

- [ ] **Step 8: Run the tests to confirm they pass**

Run: `npx vitest run src/components/ui/primitives.test.tsx`
Expected: PASS, 10 tests.

- [ ] **Step 9: Write failing dialog tests**

Create `src/components/ui/ConfirmDialog.test.tsx`. The harness owns `open` state behind an `Open` trigger and renders `<ConfirmDialog confirmLabel="Delete" description="This removes the run." onCancel={() => setOpen(false)} onConfirm={() => setOpen(false)} open={open} title="Delete this run?" />`.

```tsx
it('starts on Cancel and wraps Tab in both directions', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Open' }));

  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

  await user.tab({ shift: true });
  expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();

  await user.tab();
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
});

it('cancels on Escape and restores focus to the trigger', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const trigger = screen.getByRole('button', { name: 'Open' });
  await user.click(trigger);
  await user.keyboard('{Escape}');

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it('cancels from the backdrop', async () => {
  const user = userEvent.setup();
  const { container } = render(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Open' }));

  const backdrop = container.querySelector('[aria-hidden="true"]');
  expect(backdrop).not.toBeNull();
  await user.click(backdrop as HTMLElement);

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
```

- [ ] **Step 10: Run the tests to confirm they fail**

Run: `npx vitest run src/components/ui/ConfirmDialog.test.tsx`
Expected: FAIL, Shift+Tab leaves the dialog and focus is not restored.

- [ ] **Step 11: Implement the focus trap and restore**

Use `useId()` for title and description ids. On open, store `document.activeElement` in a ref, focus Cancel, add a window keydown listener that handles Escape and cycles Tab within the dialog's focusable elements. Cleanup removes the listener and calls `restoreRef.current?.focus()` if the element is still connected. Add `aria-describedby` pointing at the description id. Keep the backdrop click and Cancel behavior.

- [ ] **Step 12: Run the dialog tests to confirm they pass**

Run: `npx vitest run src/components/ui/ConfirmDialog.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 13: Update `HistoryPage` for the new `Metric` markup**

Change the metric grid wrapper from `<div className="...">` to `<dl className="...">` and keep each `Metric` child unchanged. Do not change any labels, values, or classes.

- [ ] **Step 14: Run the affected suites**

Run: `npx vitest run src/components/ui src/app/pages/HistoryPage.test.tsx src/app/pages/SettingsPage.test.tsx`
Expected: PASS.

- [ ] **Step 15: Format, run the full gate, commit, push, and watch the deploy**

Run: `npx prettier --write src/components/ui src/app/pages/HistoryPage.tsx src/styles/tokens.css docs/superpowers/specs/2026-11-03-ui-primitive-rollout-design.md docs/superpowers/plans/2026-11-03-ui-primitive-rollout.md`
Then: `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && npm run check:bundle && npm run test:e2e`
Expected: all pass with zero warnings.

Set the spec status line to `Status: approved.`

```bash
git add -A
git commit -m "Add remaining UI primitives and harden the dialog"
git push origin main
```

Then: `gh run list --limit 3`, `gh run watch <ci-run-id> --exit-status`, and the same for the Pages deploy run.
Expected: CI success, then `Deploy to Cloudflare Pages` success.

### Task 2: Bench and result surfaces

**Files:**
- Modify: `src/features/typing/TestToolbar.tsx`
- Modify: `src/features/typing/CustomTextPanel.tsx`
- Modify: `src/features/typing/ResultPanel.tsx`
- Modify: `src/features/share/SharePanel.tsx`
- Test: existing `TestToolbar.test.tsx`, `CustomTextPanel.test.tsx`, `SharePanel.test.tsx`

**Interfaces:**
- Consumes: every export from Task 1.
- Produces: no new exports. The `TestToolbar`, `CustomTextPanel`, `ResultPanel`, and `SharePanel` prop APIs stay unchanged.

- [ ] **Step 1: Run the existing suites as a baseline**

Run: `npx vitest run src/features/typing/TestToolbar.test.tsx src/features/typing/CustomTextPanel.test.tsx src/features/share/SharePanel.test.tsx`
Expected: PASS. Record the count.

- [ ] **Step 2: Refactor `TestToolbar`**

- Mode group: `<ChoiceGroup frame="outline" label="Test mode">` with `ChoiceButton size="md"` children. Keep `displayMode`, `switchMode`, and the Text button calling `onCustomText`.
- Duration and word-count groups: `<ChoiceGroup label="Duration">` / `label="Word count"`, `ChoiceButton size="xs" tone="soft"`.
- Modifiers group: `<ChoiceGroup label="Modifiers">` with `size="xs" tone="soft"`.
- Vocabulary: `<Select aria-label="Vocabulary" density="sm">` inside the existing label. Preserve the `english-1k` / `english-200` mapping.
- Restart: `<Button aria-label="Restart test" size="compact" variant="secondary">` with the existing icon and responsive label.
- Preset chips: `<Button className="font-mono" disabled={disabled} size="sm" variant="secondary">`.
- Delete the local `ModeButton` and `OptionButton` components.
- Keep layout classes on the primitives through `className` only (order, margin, shrink, hidden).

- [ ] **Step 3: Add a disabled-state test and run the toolbar suite**

Append to `src/features/typing/TestToolbar.test.tsx`:

```tsx
it('disables every control during a run and keeps the active mode pressed', () => {
  render(
    <TestToolbar
      config={DEFAULT_TIMED_CONFIG}
      disabled
      onChange={() => {}}
      onCustomText={() => {}}
      onRestart={() => {}}
    />,
  );

  for (const button of screen.getAllByRole('button')) {
    expect(button).toBeDisabled();
  }

  expect(screen.getByRole('button', { name: 'Time' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByLabelText('Vocabulary')).toBeDisabled();
});
```

Run: `npx vitest run src/features/typing/TestToolbar.test.tsx`
Expected: PASS.

- [ ] **Step 4: Refactor `CustomTextPanel`**

Use `<Textarea>` for the input, `<Button variant="secondary">` for Cancel, `<Button variant="primary">` for Start, and `<StatusMessage tone="error">` for the over-limit message. Keep `autoFocus`, the Escape handler, the label wiring, and the word/character count unchanged.

- [ ] **Step 5: Run the custom-text suite**

Run: `npx vitest run src/features/typing/CustomTextPanel.test.tsx`
Expected: PASS, including the `getByRole('alert')` assertion.

- [ ] **Step 6: Refactor `ResultPanel`**

- Wrap the hero block in `<dl className="sm:text-right">` and use `<HeroStat label="Net WPM" value={result.netWpm.toFixed(0)} caption={`${formatPercent(result.accuracy, 1)} accuracy`} valueTestId="result-net-wpm" />`.
- Replace the two local metric loops with `<Metric size="md">` in the first `<dl>` and `<Metric size="sm">` in the second.
- Next and Repeat use `<Button size="lg" variant="primary">` / `<Button size="lg">` with the existing icons.
- Flags use `<StatusMessage tone="info" variant="plain">`.
- Delete the local `Metric` and `SmallMetric` functions.

- [ ] **Step 7: Refactor `SharePanel`**

- Card shell becomes `<Card as="section" aria-labelledby="share-title" className="mt-8" data-testid="share-panel">`.
- Share label and Unranked badge use `<Overline>` with `accent` and `muted` tones.
- Actions use `<Button>` with the existing icons. Download uses `disabled={busy}`.
- Link field uses `<Input readOnly density="sm">` with `className` for flex sizing only.
- Status output uses `<StatusMessage tone={status.kind === 'error' ? 'error' : 'info'} variant="plain" className="mt-3 min-h-5">` with an empty child when idle.
- Summary `<pre>` uses `rounded-control`.

- [ ] **Step 8: Run the result and share suites**

Run: `npx vitest run src/features/typing src/features/share`
Expected: PASS, same test count as the baseline plus any added toolbar assertion.

- [ ] **Step 9: Search for override drift**

Search the four files for `className` values containing `bg-`, `border-`, `rounded-`, `text-ink`, `text-paper`, `text-accent`, or `text-danger`.
Expected: only layout classes inside primitive `className` props. Colour, radius, and padding expectations belong in variants. Fix any hit that fights a variant.

- [ ] **Step 10: Format, run the full gate, commit, push, and watch the deploy**

Run: `npx prettier --write src/features/typing/TestToolbar.tsx src/features/typing/CustomTextPanel.tsx src/features/typing/ResultPanel.tsx src/features/share/SharePanel.tsx`
Then: `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && npm run check:bundle && npm run test:e2e`
Expected: all pass.

```bash
git add -A
git commit -m "Move bench and result surfaces onto UI primitives"
git push origin main
```

Then: `gh run list --limit 3`, `gh run watch <ci-run-id> --exit-status`, and the same for the Pages deploy run.
Expected: CI success, then `Deploy to Cloudflare Pages` success.

### Task 3: Pages and settings panels

**Files:**
- Modify: `src/app/pages/HomePage.tsx`
- Modify: `src/app/pages/ResultDetailPage.tsx`
- Modify: `src/app/pages/SharedResultPage.tsx`
- Modify: `src/app/pages/HistoryPage.tsx`
- Modify: `src/app/pages/SettingsPage.tsx`
- Modify: `src/features/history/StoragePanel.tsx`
- Modify: `src/features/history/BackupPanel.tsx`
- Modify: `src/app/AppLayout.tsx`
- Test: existing page and panel suites

**Interfaces:**
- Consumes: every export from Task 1, including `buttonStyles({ size: 'link', weight: 'normal' })` for the nav pills.
- Produces: no new exports.

- [ ] **Step 1: Run the existing suites as a baseline**

Run: `npx vitest run src/app/pages src/features/history`
Expected: PASS. Record the count.

- [ ] **Step 2: Refactor `HomePage`, `HistoryPage`, and `SettingsPage`**

HomePage: replace the loading bench shell with `<Card className="mt-6 sm:mt-8" padding="roomy">`. Replace the field-notes link with `<Link className={buttonStyles()}>`. Keep the arrow character in the link text.

HistoryPage: replace the inline action error with `<StatusMessage tone="error" variant="plain" className="mt-4 text-sm">`. Keep the Suspense loading text as it is.

SettingsPage: replace the preset status paragraph with `<StatusMessage tone="info" variant="plain" className="mt-2 min-h-4">`. Keep the preset status text unchanged.

- [ ] **Step 3: Refactor `ResultDetailPage` and `SharedResultPage`**

- Hero blocks: `<dl className="...">` containing `<HeroStat label="Net WPM" ... />`.
- Metric grids: `<Metric>` with `size="md"`.
- Remaining small character metrics: `<Metric size="sm">`.
- Link pairs: `buttonStyles({ variant: 'primary' })` and `buttonStyles()`.
- Delete each file's local `Metric` and `SmallMetric` functions.

- [ ] **Step 4: Run the page suites**

Run: `npx vitest run src/app/pages`
Expected: PASS.

- [ ] **Step 5: Refactor `AppLayout`**

`navLinkClassName` returns `buttonStyles({ variant: isActive ? 'primary' : 'ghost', size: 'link', weight: 'normal' })`. Keep `NavLink`. Keep the banner wrapper, copy, and dismiss button as they are; the banner is not a `StatusMessage` because it owns a dismiss action.

- [ ] **Step 6: Refactor `StoragePanel`**

- Shell becomes `<Card as="section" aria-labelledby="storage-title" className="mt-8">`.
- Error uses `<StatusMessage tone="error" className="mt-3">`.
- Busy and success line uses `<StatusMessage tone="info" variant="plain" className="mt-2 min-h-4">`, with text `Deleting…` (the existing ellipsis) or the current status string.
- Every cleanup and cancel action uses `<Button>`; the confirmation buttons keep their exact accessible names.
- Keep `data-testid="storage-summary"` and all copy unchanged. Do not add a new label above the summary.

- [ ] **Step 7: Refactor `BackupPanel`**

- Shell becomes `<Card as="section" aria-labelledby="backup-title" className="mt-8 scroll-mt-6" id="backup">`.
- Export JSON is primary; CSV, Import, Confirm, and Cancel are secondary. The import label reuses `buttonStyles({ className: 'cursor-pointer' })` with `pointer-events-none opacity-50` when busy.
- Message block becomes `<StatusMessage tone={message.kind} details={message.kind === 'error' ? message.issues.map((issue) => `Row ${issue.row}: ${issue.message}`) : undefined}>`.
- Pending import box uses `rounded-control`.

- [ ] **Step 8: Run the history and layout suites**

Run: `npx vitest run src/features/history src/app/AppRoutes.test.tsx src/test/smoke.test.tsx`
Expected: PASS, same behavioural expectations. Locator updates are allowed only where an element type changed.

- [ ] **Step 9: Search for override drift**

Search the eight files for `className` values containing `bg-`, `border-`, `rounded-`, `text-ink`, `text-paper`, `text-accent`, or `text-danger`.
Expected: only layout classes. Fix any hit that fights a variant.

- [ ] **Step 10: Run the full gate, commit, push, and watch the deploy**

Run: `npx prettier --write src/app/pages/HomePage.tsx src/app/pages/ResultDetailPage.tsx src/app/pages/SharedResultPage.tsx src/app/pages/HistoryPage.tsx src/app/pages/SettingsPage.tsx src/features/history/StoragePanel.tsx src/features/history/BackupPanel.tsx src/app/AppLayout.tsx`
Then: `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && npm run check:bundle && npm run test:e2e`
Expected: all pass.

```bash
git add -A
git commit -m "Move pages and settings panels onto UI primitives"
git push origin main
```

Then: `gh run list --limit 3`, `gh run watch <ci-run-id> --exit-status`, and the same for the Pages deploy run.
Expected: CI success, then `Deploy to Cloudflare Pages` success.

### Task 4: Final review and production smoke

**Files:** none. Verification only.

- [ ] **Step 1: Review the three commits for accidental behaviour change**

Run: `git log --oneline -4` and `git diff HEAD~3 --stat`
Expected: three code commits. The diff touches only `src/components/ui`, the listed surfaces, `src/styles/tokens.css`, `HistoryPage` markup, and docs. No engine, repository, schema, or share-format file.

- [ ] **Step 2: Confirm every surface uses the primitives**

Search for remaining raw `<button` and raw card shells outside `src/components/ui`:
Expected: only native controls inside primitives, plus `AppLayout`'s skip link and banner dismiss, `TestToolbar` file-adjacent markup that has no primitive counterpart, and any element deliberately left native. Report anything unexpected.

- [ ] **Step 3: Smoke the live site**

Open `https://typelab-b1o.pages.dev` and check: the bench renders, a mode and duration change, a short run completes, the result hero matches the previous layout, Settings still saves, History deletes through the dialog, and the nav pills look unchanged. Report anything that moved.

- [ ] **Step 4: Report**

Report the three commit hashes, unit and e2e counts, bundle numbers, CI and deploy runs, and any visual difference found during the smoke.
