# TypeLab v1 Close-out — Storage and Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the storage, history, and quality gaps in Phase 2 without changing scoring, settings schema, or the local-only product boundary.

**Architecture:** Add summary and bulk-deletion methods to the existing Dexie repository, expose them through a focused `StoragePanel` inside Settings, and accumulate paged history rows in `HistoryPage`. Finish with metadata, route, copy, layout, and documentation corrections.

**Tech Stack:** React 19, TypeScript 6, Dexie 4, Zod 4, Vitest + React Testing Library, Playwright, Vite.

**Spec:** `docs/superpowers/specs/2026-11-01-v1-closeout-design.md`

## Global Constraints

- Local-only v1: no accounts, backend, sync, analytics, or server-side storage.
- Settings schema stays at v5 in this slice. Accents are a later slice.
- Backup schema stays at version 1.
- No automatic retention or background pruning. Deletion happens only after a two-step confirmation.
- Bulk deletion removes history only; settings, presets, and metadata are untouched.
- The storage size is labelled an estimate of TypeLab history payload, not browser quota.
- No interface translation in this slice.
- Strict CSP: no inline scripts.
- Every task ends with its own tests and commit. Full gate before push: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`, `npm run check:bundle`, `npm run test:e2e`.
- Bundle budgets: entry JS ≤ 160 kB, all JS ≤ 340 kB, CSS ≤ 16 kB gzip.
- Existing copy uses the “lab notebook” voice; new copy stays plain and local-first.

## Review Focus

- **Exactly-90-days-old run:** a run completed at the cutoff must be retained, not deleted. Tested in Task 1.
- **Empty history:** summary and both delete controls must show an empty state without errors or misleading confirmations. Tested in Tasks 1 and 2.
- **Duplicate row during “Load more”:** a concurrent save must not render the same run twice. Tested in Task 3.
- **Blocked IndexedDB on Settings:** a storage read failure must show a recoverable panel without breaking the rest of Settings. Tested in Task 2.
- **Deleting a row while more rows remain:** totals, loaded rows, and “Load more” must stay consistent. Tested in Task 3.

---

### Task 1: Repository storage summary and bulk deletion

**Files:**
- Modify: `src/features/history/resultRepository.ts`
- Test: `src/features/history/resultRepository.test.ts`

**Interfaces:**
- Consumes: existing `TypelabDatabase`, `TestResult`, and `list()`.
- Produces:
  - `export const STORAGE_RETENTION_DAYS = 90`
  - `export interface StorageSummary { count: number; bytes: number; oldestCompletedAt: string | null; newestCompletedAt: string | null; olderThan90Days: number }`
  - `export function storageCutoff(now?: Date): string`
  - `getStorageSummary(now?: Date): Promise<StorageSummary>`
  - `deleteOlderThan(cutoffIso: string): Promise<number>`
  - `deleteAll(): Promise<number>`

- [ ] **Step 1: Write the failing repository tests**

Append to `src/features/history/resultRepository.test.ts`:

```ts
it('summarises count, size, dates, and runs older than 90 days', async () => {
  const { repository } = createRepository();
  const now = new Date('2026-11-01T12:00:00.000Z');
  const older = makeResult({ completedAt: '2026-08-02T12:00:00.000Z' });
  const boundary = makeResult({ completedAt: '2026-08-03T12:00:00.000Z' });
  const newer = makeResult({ completedAt: '2026-10-01T12:00:00.000Z' });

  for (const result of [older, boundary, newer]) {
    await repository.save(result);
  }

  const expectedBytes = [older, boundary, newer].reduce(
    (total, result) => total + new TextEncoder().encode(JSON.stringify(result)).length,
    0,
  );
  const summary = await repository.getStorageSummary(now);

  expect(summary).toEqual({
    count: 3,
    bytes: expectedBytes,
    oldestCompletedAt: older.completedAt,
    newestCompletedAt: newer.completedAt,
    olderThan90Days: 1,
  });
  expect(storageCutoff(now)).toBe('2026-08-03T12:00:00.000Z');
});

it('returns an empty storage summary', async () => {
  const { repository } = createRepository();

  await expect(repository.getStorageSummary(new Date('2026-11-01T12:00:00.000Z'))).resolves.toEqual({
    count: 0,
    bytes: 0,
    oldestCompletedAt: null,
    newestCompletedAt: null,
    olderThan90Days: 0,
  });
});

it('deletes only runs strictly older than the cutoff', async () => {
  const { repository } = createRepository();
  const older = makeResult({ completedAt: '2026-08-02T12:00:00.000Z' });
  const boundary = makeResult({ completedAt: '2026-08-03T12:00:00.000Z' });
  const newer = makeResult({ completedAt: '2026-10-01T12:00:00.000Z' });

  for (const result of [older, boundary, newer]) {
    await repository.save(result);
  }

  await expect(repository.deleteOlderThan('2026-08-03T12:00:00.000Z')).resolves.toBe(1);
  await expect(repository.list({ includeExcluded: true })).resolves.toMatchObject({
    total: 2,
    items: [{ id: newer.id }, { id: boundary.id }],
  });
});

it('deletes all runs and keeps metadata', async () => {
  const { repository } = createRepository();
  await repository.save(makeResult());
  await repository.save(makeResult());
  await repository.setMeta('lastExportAt', '2026-10-27T12:00:00.000Z');

  await expect(repository.deleteAll()).resolves.toBe(2);
  await expect(repository.list({ includeExcluded: true })).resolves.toMatchObject({ total: 0 });
  await expect(repository.getMeta('lastExportAt')).resolves.toBe('2026-10-27T12:00:00.000Z');
});
```

Add `storageCutoff` to the existing import from `resultRepository`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/history/resultRepository.test.ts`

Expected: FAIL because `getStorageSummary`, `deleteOlderThan`, `deleteAll`, and `storageCutoff` are missing.

- [ ] **Step 3: Implement the repository methods**

In `src/features/history/resultRepository.ts`:

```ts
export const STORAGE_RETENTION_DAYS = 90;

export interface StorageSummary {
  count: number;
  bytes: number;
  oldestCompletedAt: string | null;
  newestCompletedAt: string | null;
  olderThan90Days: number;
}

export function storageCutoff(now: Date = new Date()): string {
  return new Date(now.getTime() - STORAGE_RETENTION_DAYS * 86_400_000).toISOString();
}
```

Implement:

- `getStorageSummary(now = new Date())` uses `count()`, `where('completedAt').below(storageCutoff(now)).count()`, `orderBy('completedAt').first()` / `.last()`, and an `each()` cursor summing `new TextEncoder().encode(JSON.stringify(result)).length`. Return `oldestCompletedAt` / `newestCompletedAt` from the first and last rows or `null`.
- `deleteOlderThan(cutoffIso)` runs a read-write transaction over `results`, collects primary keys below the cutoff, `bulkDelete`s them, and returns the key count.
- `deleteAll()` runs a read-write transaction, counts with `count()`, then `clear()`s `results`, returning the count. Do not clear `meta`.

- [ ] **Step 4: Run the repository tests to verify they pass**

Run: `npx vitest run src/features/history/resultRepository.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/history/resultRepository.ts src/features/history/resultRepository.test.ts
git commit -m "feat: add history storage summary and bulk cleanup"
```

---

### Task 2: Storage panel in Settings

**Files:**
- Create: `src/features/history/StoragePanel.tsx`
- Create: `src/features/history/StoragePanel.test.tsx`
- Modify: `src/app/pages/SettingsPage.tsx`
- Modify: `src/app/pages/SettingsPage.test.tsx`
- Modify: `src/features/history/BackupPanel.tsx`

**Interfaces:**
- Consumes: `StorageSummary`, `storageCutoff`, `getResultRepository`, and `STORAGE_RETENTION_DAYS` from Task 1.
- Produces:
  - `export interface StorageRepository { getStorageSummary(now?: Date): Promise<StorageSummary>; deleteOlderThan(cutoffIso: string): Promise<number>; deleteAll(): Promise<number> }`
  - `export function StoragePanel({ repository, now }: { repository?: StorageRepository; now?: () => Date })`
  - `SettingsPage` accepts `{ storageRepository?: StorageRepository }` and forwards it.

- [ ] **Step 1: Write the failing StoragePanel tests**

Create `src/features/history/StoragePanel.test.tsx` with a fake repository and these assertions:

```tsx
const NOW = new Date('2026-11-01T12:00:00.000Z');
const SUMMARY = {
  count: 12,
  bytes: 1536,
  oldestCompletedAt: '2026-01-02T12:00:00.000Z',
  newestCompletedAt: '2026-10-30T12:00:00.000Z',
  olderThan90Days: 3,
};

function createRepository(summary = SUMMARY) {
  return {
    getStorageSummary: vi.fn(() => Promise.resolve(summary)),
    deleteOlderThan: vi.fn(() => Promise.resolve(3)),
    deleteAll: vi.fn(() => Promise.resolve(12)),
  };
}
```

Tests:

```tsx
function renderPanel(repository: ReturnType<typeof createRepository>) {
  return render(<StoragePanel repository={repository} now={() => NOW} />);
}

it('shows the storage summary', async () => {
  const repository = createRepository();
  renderPanel(repository);

  const summary = await screen.findByTestId('storage-summary');

  expect(summary).toHaveTextContent('12 runs');
  expect(summary).toHaveTextContent('~1.5 kB');
  expect(summary).toHaveTextContent('3 older than 90 days');
  expect(repository.getStorageSummary).toHaveBeenCalledWith(NOW);
});

it('confirms before deleting runs older than 90 days', async () => {
  const user = userEvent.setup();
  const repository = createRepository();
  renderPanel(repository);
  await screen.findByTestId('storage-summary');

  await user.click(screen.getByRole('button', { name: 'Delete older than 90 days' }));
  expect(repository.deleteOlderThan).not.toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: 'Confirm delete 3 runs' }));

  await waitFor(() => {
    expect(repository.deleteOlderThan).toHaveBeenCalledWith('2026-08-03T12:00:00.000Z');
  });
  expect(await screen.findByText('Deleted 3 runs older than 90 days.')).toBeInTheDocument();
  expect(repository.getStorageSummary).toHaveBeenCalledTimes(2);
});

it('cancels a pending older-run deletion', async () => {
  const user = userEvent.setup();
  const repository = createRepository();
  renderPanel(repository);
  await screen.findByTestId('storage-summary');

  await user.click(screen.getByRole('button', { name: 'Delete older than 90 days' }));
  await user.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(repository.deleteOlderThan).not.toHaveBeenCalled();
  expect(
    screen.getByRole('button', { name: 'Delete older than 90 days' }),
  ).toBeInTheDocument();
});

it('confirms before deleting all runs', async () => {
  const user = userEvent.setup();
  const repository = createRepository();
  renderPanel(repository);
  await screen.findByTestId('storage-summary');

  await user.click(screen.getByRole('button', { name: 'Delete all runs' }));
  expect(repository.deleteAll).not.toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: 'Confirm delete all 12 runs' }));

  await waitFor(() => {
    expect(repository.deleteAll).toHaveBeenCalledTimes(1);
  });
  expect(await screen.findByText('Deleted 12 runs.')).toBeInTheDocument();
});

it('disables controls when there is nothing to delete', async () => {
  const repository = createRepository({ ...SUMMARY, olderThan90Days: 0 });
  renderPanel(repository);

  expect(await screen.findByText('No runs are older than 90 days.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Delete older than 90 days' })).toBeDisabled();
});

it('shows an empty state with no saved runs', async () => {
  const repository = createRepository({
    count: 0,
    bytes: 0,
    oldestCompletedAt: null,
    newestCompletedAt: null,
    olderThan90Days: 0,
  });
  renderPanel(repository);

  expect(await screen.findByText('No runs saved yet.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Delete all runs' })).toBeDisabled();
});

it('recovers when the summary cannot be read', async () => {
  const repository = createRepository();
  repository.getStorageSummary.mockRejectedValueOnce(new Error('blocked'));
  renderPanel(repository);

  expect(
    await screen.findByText('Local storage could not be read. History is unchanged.'),
  ).toBeInTheDocument();
});

it('links to the backup panel', async () => {
  renderPanel(createRepository());

  expect(await screen.findByRole('link', { name: 'Export a backup first' })).toHaveAttribute(
    'href',
    '#backup',
  );
});
```

Import `render`, `screen`, `waitFor`, and `userEvent` in the test file.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/history/StoragePanel.test.tsx`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement StoragePanel**

Create a section with `aria-labelledby="storage-title"`, heading `Storage and cleanup`, and:

- A summary line with `data-testid="storage-summary"` containing run count, `formatBytes(bytes)`, oldest date, and the older-than-90 copy.
- `formatBytes`: `0 B` for zero, `${bytes} B` below 1024, one decimal `kB` below 1 MB, one decimal `MB` otherwise.
- The export anchor to `#backup`.
- Two buttons with the labels above and inline two-step confirmation state. Use `now?.() ?? new Date()` for both summary and cutoff so a test’s fixed clock is consistent.
- Busy state disables both delete buttons while a deletion runs.
- `role="status"` for success copy and `role="alert"` for failures.
- On mount and after each successful deletion, call `getStorageSummary` again.
- Default repository: `getResultRepository()`.

Modify `SettingsPage` to accept the optional `storageRepository` prop and render `<StoragePanel repository={storageRepository} />` after the Presets fieldset and before `<BackupPanel />`.

Modify `BackupPanel`’s outer section to add `id="backup"` and `scroll-mt-6`.

- [ ] **Step 4: Update SettingsPage tests**

In `src/app/pages/SettingsPage.test.tsx`, give `renderPage` a stub storage repository and pass it to `<SettingsPage storageRepository={storageRepository} />`. Add one test:

```tsx
it('shows history storage controls', async () => {
  const { repository } = createRepository();
  renderPage(repository);

  expect(await screen.findByRole('heading', { name: 'Storage and cleanup' })).toBeInTheDocument();
  expect(screen.getByTestId('storage-summary')).toHaveTextContent('0 runs');
});
```

- [ ] **Step 5: Run the focused tests to verify they pass**

Run: `npx vitest run src/features/history/StoragePanel.test.tsx src/app/pages/SettingsPage.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/history/StoragePanel.tsx src/features/history/StoragePanel.test.tsx src/app/pages/SettingsPage.tsx src/app/pages/SettingsPage.test.tsx src/features/history/BackupPanel.tsx
git commit -m "feat: add storage controls to settings"
```

---

### Task 3: Incremental history loading

**Files:**
- Modify: `src/app/pages/HistoryPage.tsx`
- Test: `src/app/pages/HistoryPage.test.tsx`

**Interfaces:**
- Consumes: `HistoryQuery`, `HistoryPageData`, and `list({ limit, offset, includeExcluded, testMode })` from the repository.
- Produces: no new exports. `HistoryPage` keeps its `repository` prop.

- [ ] **Step 1: Update existing expectations and add failing paging tests**

In `src/app/pages/HistoryPage.test.tsx`:

- Change the initial `list` expectation in the first test to include `offset: 0`.
- Change the excluded-run and mode-filter expectations to include `offset: 0`.
- Replace the delete test’s “list called twice” assertion with:

```tsx
await waitFor(() => {
  expect(repository.delete).toHaveBeenCalledWith('result-1');
});
expect(screen.queryByText('30 seconds')).not.toBeInTheDocument();
expect(screen.getByText(/no runs match yet/i)).toBeInTheDocument();
expect(repository.list).toHaveBeenCalledTimes(1);
```

Add:

```tsx
it('loads older runs without duplicating a row', async () => {
  const user = userEvent.setup();
  const first = [
    makeResult({ id: 'result-3', completedAt: '2026-10-29T12:00:00.000Z' }),
    makeResult({ id: 'result-2', completedAt: '2026-10-28T12:00:00.000Z' }),
  ];
  const list = vi
    .fn()
    .mockResolvedValueOnce({ items: first, total: 3, hasMore: true })
    .mockResolvedValueOnce({
      items: [first[1], makeResult({ id: 'result-1' })],
      total: 3,
      hasMore: false,
    });

  render(
    <MemoryRouter>
      <HistoryPage repository={{ list, delete: async () => {} }} />
    </MemoryRouter>,
  );

  await screen.findByText('2 of 3 runs');
  await user.click(screen.getByRole('button', { name: 'Load more' }));

  await waitFor(() => {
    expect(screen.getAllByRole('link', { name: '30 seconds' })).toHaveLength(3);
  });
  expect(list).toHaveBeenLastCalledWith({
    limit: 100,
    offset: 2,
    includeExcluded: false,
  });
  expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
});

it('resets paging when a filter changes', async () => {
  const user = userEvent.setup();
  const first = [makeResult({ id: 'result-2' }), makeResult({ id: 'result-1' })];
  const list = vi
    .fn()
    .mockResolvedValueOnce({ items: first, total: 3, hasMore: true })
    .mockResolvedValueOnce({ items: [makeResult({ id: 'result-0' })], total: 1, hasMore: false })
    .mockResolvedValueOnce({
      items: [makeResult({ id: 'words-1', testMode: 'words' })],
      total: 1,
      hasMore: false,
    });

  render(
    <MemoryRouter>
      <HistoryPage repository={{ list, delete: async () => {} }} />
    </MemoryRouter>,
  );

  await screen.findByText('2 of 3 runs');
  await user.click(screen.getByRole('button', { name: 'Load more' }));
  await screen.findByText('3 runs');

  await user.selectOptions(screen.getByLabelText('Filter by mode'), 'words');

  await waitFor(() => {
    expect(list).toHaveBeenLastCalledWith({
      limit: 100,
      offset: 0,
      includeExcluded: false,
      testMode: 'words',
    });
  });
  expect(screen.getByText('1 run')).toBeInTheDocument();
});

it('keeps paging consistent after deleting a loaded row', async () => {
  const user = userEvent.setup();
  const items = [
    makeResult({ id: 'result-3' }),
    makeResult({ id: 'result-2' }),
    makeResult({ id: 'result-1' }),
  ];
  const list = vi.fn(() => Promise.resolve({ items, total: 5, hasMore: true }));
  const remove = vi.fn(() => Promise.resolve());
  vi.spyOn(window, 'confirm').mockReturnValue(true);

  render(
    <MemoryRouter>
      <HistoryPage repository={{ list, delete: remove }} />
    </MemoryRouter>,
  );

  await screen.findByText('3 of 5 runs');
  await user.click(screen.getAllByRole('button', { name: /delete run/i })[0]);

  await waitFor(() => {
    expect(remove).toHaveBeenCalledWith('result-3');
  });
  expect(screen.getByText('2 of 5 runs')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Load more' })).toBeInTheDocument();
});
```

Add:

```tsx
it('caps the trend chart at the newest 200 loaded runs', async () => {
  const results = Array.from({ length: 201 }, (_, index) =>
    makeResult({
      id: `result-${index}`,
      clientTestId: `client-${index}`,
      completedAt: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(),
    }),
  );

  renderPage(createRepository(results));

  expect(
    await screen.findByText('The chart shows the latest 200 loaded runs.'),
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/pages/HistoryPage.test.tsx`

Expected: FAIL on missing `offset`, `Load more`, and the new summary text.

- [ ] **Step 3: Implement accumulated pages**

Replace the single `page` state with:

- `items`, `total`, `hasMore`, `status`, `loadingMore`.
- Initial effect: `list({ limit: 100, offset: 0, includeExcluded, ...(mode === 'all' ? {} : { testMode: mode }) })`; reset `items` to the response.
- `loadMore`: request `offset: items.length`; merge by result id with a `Map` or `Set`; update `total` and `hasMore`; set an error if the request fails.
- Delete: filter the deleted id out of `items`, decrement `total` with a floor of zero, and do not re-fetch.
- Trend chart: pass `items.slice(0, 200)`.
- Summary: `hasMore ? \`${items.length} of ${total} runs\` : \`${total} ${total === 1 ? 'run' : 'runs'}\``.
- Empty state when `status === 'ready' && items.length === 0`.
- “Load more” button while `hasMore`; disabled and labelled `Loading…` while `loadingMore`.
- When `items.length > 200`, show `The chart shows the latest 200 loaded runs.`

- [ ] **Step 4: Run the history tests to verify they pass**

Run: `npx vitest run src/app/pages/HistoryPage.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/pages/HistoryPage.tsx src/app/pages/HistoryPage.test.tsx
git commit -m "feat: load history in pages"
```

---

### Task 4: Social metadata and static OG dimensions

**Files:**
- Modify: `index.html`
- Create: `src/app/metadata.test.ts`

**Interfaces:**
- Consumes: existing `public/og.png`.
- Produces: no runtime API.

- [ ] **Step 1: Write the failing metadata test**

Create `src/app/metadata.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('static metadata', () => {
  it('ships the social metadata used by link previews', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf8');

    expect(html).toMatch(/property="og:site_name"[^>]*content="TypeLab"/);
    expect(html).toMatch(/property="og:locale"[^>]*content="en_GB"/);
    expect(html).toMatch(/property="og:image:type"[^>]*content="image\/png"/);
    expect(html).toMatch(/name="twitter:image:alt"[^>]*content="[^"]+"/);
  });

  it('ships a 1200x630 Open Graph PNG', () => {
    const png = readFileSync(resolve(root, 'public/og.png'));

    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(1_200);
    expect(png.readUInt32BE(20)).toBe(630);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/metadata.test.ts`

Expected: FAIL on the missing metadata tags. The PNG assertion may already pass.

- [ ] **Step 3: Add the tags**

In `index.html`, beside the existing Open Graph tags, add:

```html
<meta property="og:site_name" content="TypeLab" />
<meta property="og:locale" content="en_GB" />
<meta property="og:image:type" content="image/png" />
<meta name="twitter:image:alt" content="TypeLab — a local-first typing laboratory." />
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/app/metadata.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html src/app/metadata.test.ts
git commit -m "test: pin social metadata and OG dimensions"
```

---

### Task 5: Route-table coverage

**Files:**
- Create: `src/app/AppRoutes.test.tsx`

**Interfaces:**
- Consumes: `AppRoutes` and the existing page headings.
- Produces: no runtime API.

- [ ] **Step 1: Write the failing route-table test**

Create `src/app/AppRoutes.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { AppRoutes } from '@/app/AppRoutes';

const ROUTES: readonly [string, RegExp][] = [
  ['/', /the typing bench/i],
  ['/about', /about the lab/i],
  ['/history', /local history/i],
  ['/settings', /make the lab yours/i],
  ['/shared', /this link is not readable/i],
  ['/results/missing', /run not found/i],
  ['/missing', /not in the notebook/i],
];

describe('route table', () => {
  it.each(ROUTES)('renders %s', async (path, heading) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails or exposes gaps**

Run: `npx vitest run src/app/AppRoutes.test.tsx`

Expected: PASS if every route is already reachable; if a route is missing from `AppRoutes`, the test fails. Do not add a route to satisfy the test.

- [ ] **Step 3: Commit**

```bash
git add src/app/AppRoutes.test.tsx
git commit -m "test: cover every declared route"
```

---

### Task 6: Page structure, copy, and eyebrow consistency

**Files:**
- Create: `src/app/components/Eyebrow.tsx`
- Create: `src/app/components/Eyebrow.test.tsx`
- Modify: `src/app/pages/HomePage.tsx`
- Modify: `src/app/pages/AboutPage.tsx`
- Modify: `src/app/pages/HistoryPage.tsx`
- Modify: `src/app/pages/SettingsPage.tsx`
- Modify: `src/app/pages/ResultDetailPage.tsx`
- Modify: `src/app/pages/SharedResultPage.tsx`
- Modify: `src/app/pages/NotFoundPage.tsx`
- Modify: `src/app/pages/AboutPage.test.tsx`
- Modify: `src/test/smoke.test.tsx`
- Modify: `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Produces: `export function Eyebrow({ children, className }: { children: ReactNode; className?: string })`.

- [ ] **Step 1: Write the failing eyebrow and structure tests**

Create `src/app/components/Eyebrow.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Eyebrow } from '@/app/components/Eyebrow';

describe('eyebrow', () => {
  it('renders a mono uppercase accent label', () => {
    render(<Eyebrow>Field notes / 01</Eyebrow>);

    const label = screen.getByText('Field notes / 01');

    expect(label.tagName).toBe('P');
    expect(label).toHaveClass('font-mono', 'uppercase', 'text-accent');
  });
});
```

Add to `src/test/smoke.test.tsx`:

```tsx
it('keeps the field notes beside the bench, not inside it', () => {
  render(
    <MemoryRouter>
      <AppRoutes />
    </MemoryRouter>,
  );

  const bench = screen.getByRole('region', { name: /the typing bench/i });
  const notes = screen.getByRole('region', { name: /built for practice/i });

  expect(notes.parentElement).toBe(bench.parentElement);
  expect(bench.contains(notes)).toBe(false);
});
```

Add to `src/app/pages/AboutPage.test.tsx`:

```tsx
expect(screen.getByText(/no application server/i)).toBeInTheDocument();
expect(screen.queryByText(/with no account and no server/i)).not.toBeInTheDocument();
```

Add to `tests/e2e/smoke.spec.ts`:

```ts
test('the typing surface stays above the fold at 375 by 667', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');

  const surface = page.getByTestId('typing-surface');
  const box = await surface.boundingBox();

  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(667);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(375);
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npx vitest run src/app/components/Eyebrow.test.tsx src/test/smoke.test.tsx src/app/pages/AboutPage.test.tsx`

Expected: FAIL because `Eyebrow` does not exist, the band is nested, and the About copy still says “no server”.

- [ ] **Step 3: Implement Eyebrow and replace page-level labels**

Create `Eyebrow` with the shared classes
`font-mono text-xs uppercase tracking-[0.2em] text-accent` plus any `className`.

Replace only page-level labels with `<Eyebrow>`:

- `HomePage`: `Instrument / 001` and `Field notes / 01`.
- `AboutPage`: `Field notes / About`.
- `HistoryPage`: `The record book`.
- `SettingsPage`: `Settings`.
- `ResultDetailPage`: three `Run detail` labels.
- `SharedResultPage`: two `Shared run` labels.
- `NotFoundPage`: `404 / Missing page`.

Leave smaller section labels with `tracking-[0.16em]` or `0.18em` alone.

Restructure `HomePage` so the bench section and the field-notes section are siblings inside a fragment. Keep their existing headings and classes.

- [ ] **Step 4: Fix the About copy**

Replace the intro sentence with:

> TypeLab is a local-first typing laboratory for measuring speed, accuracy, and consistency. It
> runs entirely in this browser, with no account and no application server; the app is static files.

- [ ] **Step 5: Run the focused tests to verify they pass**

Run: `npx vitest run src/app/components/Eyebrow.test.tsx src/test/smoke.test.tsx src/app/pages/AboutPage.test.tsx`

Expected: PASS.

Run the new E2E test:

`npx playwright test tests/e2e/smoke.spec.ts -g "375 by 667"`

Expected: PASS on Chromium, Firefox, and WebKit.

- [ ] **Step 6: Commit**

```bash
git add src/app/components/Eyebrow.tsx src/app/components/Eyebrow.test.tsx src/test/smoke.test.tsx tests/e2e/smoke.spec.ts src/app/pages
git commit -m "refactor: standardise page eyebrows and fix page copy"
```

---

### Task 7: Documentation and Phase 2 evidence

**Files:**
- Create: `docs/phase-2-exit.md`
- Modify: `PROJECT_CHECKLIST.md`
- Modify: `README.md`
- Modify: `docs/launch-readiness.md`

**Interfaces:**
- Consumes: completed Tasks 1–6.
- Produces: a living Phase 2 exit draft with evidence, limitations, and the mode matrix skeleton.

- [ ] **Step 1: Write `docs/phase-2-exit.md`**

Include:

- Scope of this slice and what remains for languages and accents.
- Implemented: pagination, storage summary, bulk cleanup, metadata, route coverage, page polish.
- Evidence table with commands and results from the full local gate.
- Bundle measurements after the slice.
- Mode regression matrix skeleton: timed, words, quote, custom × free, strict, no-backspace × light/dark × desktop/phone × Chromium/Firefox/WebKit, with an `Automated`, `Manual`, or `Not covered` cell.
- Known limitations: manual deletion is irreversible, other tabs refresh to see bulk deletion, offset paging is single-tab, language and accent work is still pending.
- Outstanding manual checks: real Spanish/French keyboards, iOS/Android, screen reader, Safari.
- Status line: draft until the accent slice completes.

- [ ] **Step 2: Correct the checklist**

In `PROJECT_CHECKLIST.md`:

- Mark `Live stats visibility, error highlighting, quick restart` as `[x]`.
- Mark `Personal bests per category` as `[x]`.
- Mark `Pagination/incremental loading` as `[x]`.
- Mark `Storage usage display and retention controls` as `[x]`.
- Leave `Additional languages`, `Custom colour palette`, `Mode regression matrix`, and `Phase 2 exit report` unchecked until their slices land.

- [ ] **Step 3: Update README and launch readiness**

In `README.md`, add paged history and storage cleanup to the history sentence; keep “Additional
languages are next” because that slice has not shipped.

In `docs/launch-readiness.md`, add to known limitations:

- Bulk deletion is manual, irreversible, and history-only; export first.
- Another open tab sees bulk deletion after a refresh.
- History loads 100 rows at a time; the chart covers the newest 200 loaded rows.

Do not rewrite `docs/product-spec.md` or `docs/third-party-notices.md` in this slice. Pagination
and retention were already specified, and no third-party content changes until the language slice.

- [ ] **Step 4: Run the full local gate**

Run each and record the result in `docs/phase-2-exit.md`:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run check:bundle
npm run test:e2e
```

Expected: every command exits 0. If Prettier reports files, run `npm run format` and re-run the gate.

- [ ] **Step 5: Commit**

```bash
git add docs/phase-2-exit.md PROJECT_CHECKLIST.md README.md docs/launch-readiness.md
git commit -m "docs: report phase 2 storage and quality close-out"
```

- [ ] **Step 6: Push and verify the slice**

```bash
git push origin main
```

Wait for CI to pass and the Cloudflare Pages deploy to complete. Then smoke the live site:

1. `/` still shows the typing surface above the fold at 375×667.
2. Complete a short run; it saves.
3. `/history` shows the run and can load older pages.
4. `/settings` shows the storage summary and both two-step delete controls.
5. Export a backup, delete one run, and confirm the summary changes.
6. `/about` has the corrected “no application server” copy.
7. No console errors.

Record the production result in `docs/phase-2-exit.md` and commit any recorded evidence.
