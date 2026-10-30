import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function runTenWords(page: Page, options: { delay?: number } = {}) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Words', exact: true }).click();
  await page.getByRole('button', { name: '10', exact: true }).click();

  const words = (await page.locator('[data-word-index]').allTextContents()).slice(0, 10);

  expect(words).toHaveLength(10);

  await page.getByLabel('Typing input').focus();
  await page.keyboard.type(
    words.join(' '),
    options.delay === undefined ? undefined : { delay: options.delay },
  );

  await expect(page.getByTestId('result-panel')).toBeVisible();
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-save-status', 'saved');
}

test('home page renders and primary navigation works', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /the typing bench/i })).toBeVisible();
  await expect(page.getByLabel('Typing input')).toBeAttached();

  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: /make the lab yours/i })).toBeVisible();

  await page.getByRole('link', { name: 'History', exact: true }).click();
  await expect(page.getByRole('heading', { name: /local history/i })).toBeVisible();

  await page.goto('/missing');
  await expect(page.getByRole('heading', { name: /not in the notebook/i })).toBeVisible();
});

test('a ten-word run completes and shows a result', async ({ page }) => {
  await runTenWords(page);

  const result = page.getByTestId('result-panel');
  await expect(result.getByRole('heading', { name: /run complete/i })).toBeVisible();
  await expect(page.getByTestId('result-net-wpm')).toHaveText(/\d+/);
});

test('a timed run reports live progress and restarts before completion', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Time', exact: true }).click();
  await page.getByRole('button', { name: '15', exact: true }).click();

  const words = await page.locator('[data-word-index]').allTextContents();

  await page.getByLabel('Typing input').focus();
  await page.keyboard.type(`${words.slice(0, 2).join(' ')} `, { delay: 40 });

  const surface = page.getByTestId('typing-surface');

  await expect(surface).toHaveAttribute('data-status', 'running');
  await expect(page.locator('[data-state="correct"]').first()).toBeVisible();

  await page.getByRole('button', { name: 'Restart test' }).click();

  await expect(surface).toHaveAttribute('data-status', 'idle');
  await expect(page.locator('[data-state="correct"]')).toHaveCount(0);
});

test('backspace clears a mistake before the word is committed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Words', exact: true }).click();
  await page.getByRole('button', { name: '10', exact: true }).click();

  const first = (await page.locator('[data-word-index]').first().textContent()) ?? '';

  const input = page.getByLabel('Typing input');
  await input.focus();
  await expect(input).toBeFocused();
  await page.keyboard.type(`${first.charAt(0)}zzz`, { delay: 40 });

  const incorrect = page.locator('[data-state="incorrect"]');
  await expect(incorrect).toHaveCount(3);

  for (let index = 0; index < 3; index += 1) {
    await page.keyboard.press('Backspace');
  }

  await expect(incorrect).toHaveCount(0);
});

test('punctuation and number modifiers reach the generated prompt', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Words', exact: true }).click();
  await page.getByRole('button', { name: '100', exact: true }).click();
  await page.getByRole('button', { name: 'Punctuation', exact: true }).click();
  await page.getByRole('button', { name: 'Numbers', exact: true }).click();

  const text = await page.getByTestId('typing-text').textContent();

  expect(text).toMatch(/^[A-Z]/);
  expect(text).toMatch(/\d/);
});

test('a shared link opens the same run in a fresh browser', async ({ page, browser }) => {
  await runTenWords(page);

  const link = await page.getByLabel('Share link').inputValue();
  const summary = await page.locator('[data-testid="share-panel"] pre').textContent();
  const netWpm = summary?.match(/([\d.]+) net WPM/)?.[1];

  expect(link).toMatch(/\/shared\?r=[A-Za-z0-9_-]+$/);
  expect(netWpm).toBeTruthy();

  const freshContext = await browser.newContext();
  const freshPage = await freshContext.newPage();

  await freshPage.goto(link);

  await expect(freshPage.getByRole('heading', { name: /a result from the bench/i })).toBeVisible();
  await expect(freshPage.getByTestId('shared-net-wpm')).toHaveText(netWpm ?? '');
  await expect(freshPage.getByText(/^10 words · english · /i)).toBeVisible();
  await expect(freshPage.getByText(/not checked by a server/i)).toBeVisible();

  await freshContext.close();
});

test('a run downloads as a PNG share card', async ({ page }) => {
  await runTenWords(page);

  const downloadPromise = page.waitForEvent('download');

  await page.getByRole('button', { name: /download image card/i }).click();

  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^typelab-result-\d{4}-\d{2}-\d{2}\.png$/);

  const path = await download.path();

  expect(path).toBeTruthy();

  const png = await readFile(path);

  expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
  expect(png.readUInt32BE(16)).toBe(1_200);
  expect(png.readUInt32BE(20)).toBe(630);
  await expect(page.getByText(/image card downloaded/i)).toBeVisible();
});

test('the typing surface stays above the fold on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto('/');

  const surface = page.getByTestId('typing-surface');
  const box = await surface.boundingBox();

  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(664);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
});

test('settings persist across a reload and reach the bench', async ({ page }) => {
  await page.goto('/settings');

  await page.getByRole('button', { name: 'Words', exact: true }).click();
  await page.getByRole('button', { name: '10', exact: true }).click();

  await page.reload();

  await expect(page.getByRole('button', { name: 'Words', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: '10', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByRole('link', { name: 'Test', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Words', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: '10', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('a dark theme persists and reaches the bench', async ({ page }) => {
  await page.goto('/settings');

  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByRole('link', { name: 'Test', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('a saved preset reaches the bench and survives a reload', async ({ page }) => {
  await page.goto('/settings');

  await page.getByLabel('Preset name').fill('Warm-up');
  await page.getByRole('button', { name: 'Save current setup' }).click();
  await expect(page.getByText(/saved “warm-up”/i)).toBeVisible();

  await page.getByRole('link', { name: 'Test', exact: true }).click();

  const presetGroup = page.getByRole('group', { name: 'Saved presets' });

  await expect(presetGroup.getByRole('button', { name: 'Warm-up' })).toBeVisible();

  await page.getByRole('button', { name: 'Words', exact: true }).click();
  await page.getByRole('button', { name: '100', exact: true }).click();

  await presetGroup.getByRole('button', { name: 'Warm-up' }).click();

  await expect(page.getByRole('button', { name: 'Time', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: '30', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.reload();

  await expect(presetGroup.getByRole('button', { name: 'Warm-up' })).toBeVisible();
});

test('typography, caret, motion, and sound settings persist and reach the bench', async ({
  page,
}) => {
  await page.goto('/settings');

  await page.getByRole('button', { name: 'Serif', exact: true }).click();
  await page.getByRole('button', { name: 'Large', exact: true }).click();
  await page.getByRole('button', { name: 'Wide', exact: true }).click();
  await page.getByRole('button', { name: 'Block', exact: true }).click();
  await page.getByRole('button', { name: 'Reduced', exact: true }).click();
  await page.getByLabel('Blink caret').uncheck();
  await page.getByLabel('Key sounds').check();
  await page.getByLabel('Key sound volume').focus();
  await page.keyboard.press('ArrowLeft');

  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  await expect(page.getByRole('button', { name: 'Serif', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Large', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByLabel('Key sounds')).toBeChecked();
  await expect(page.getByLabel('Key sound volume')).toHaveValue('45');

  await page.getByRole('link', { name: 'Test', exact: true }).click();

  const surface = page.getByTestId('typing-surface');
  await expect(surface).toHaveAttribute('data-font-family', 'serif');
  await expect(surface).toHaveAttribute('data-font-size', 'large');
  await expect(surface).toHaveAttribute('data-text-width', 'wide');
  await expect(surface).toHaveAttribute('data-caret-style', 'block');
  await expect(surface).toHaveAttribute('data-caret-blink', 'false');
  await expect(page.getByTestId('typing-caret')).toHaveCSS('animation-name', 'none');
});

test('a quote run completes and keeps its source', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Quote', exact: true }).click();

  const words = await page.locator('[data-word-index]').allTextContents();
  expect(words.length).toBeGreaterThan(8);

  const source = await page.getByTestId('quote-source').textContent();
  expect(source?.trim().length).toBeGreaterThan(3);

  await page.getByLabel('Typing input').focus();
  await page.keyboard.type(words.join(' '));

  await expect(page.getByTestId('result-panel')).toBeVisible();
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-save-status', 'saved');
  await expect(page.getByTestId('quote-source')).toHaveText(source ?? '');
});

test('a custom text run completes and reports itself', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Text', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  const custom = 'The quick brown fox jumps over the lazy dog.';

  await page.getByLabel('Custom text').fill(custom);
  await page.getByRole('button', { name: /start custom test/i }).click();

  const words = await page.locator('[data-word-index]').allTextContents();
  expect(words.join(' ')).toBe(custom);

  await page.getByLabel('Typing input').focus();
  await page.keyboard.type(custom);

  await expect(page.getByTestId('result-panel')).toBeVisible();
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-save-status', 'saved');
  await expect(page.getByText(/^custom text · english · /i)).toBeVisible();
});

test('a completed run survives a reload in local history', async ({ page }) => {
  await runTenWords(page);

  await page.getByRole('link', { name: 'History', exact: true }).click();
  await expect(page.getByRole('heading', { name: /local history/i })).toBeVisible();

  // Playwright types faster than a human, so the run carries the
  // under-one-second flag and is hidden unless excluded runs are shown.
  await page.getByLabel('Show excluded runs').check();

  await expect(page.getByText('10 words')).toBeVisible();
  await expect(page.getByText('1 run')).toBeVisible();

  await page.reload();

  await page.getByLabel('Show excluded runs').check();

  await expect(page.getByText('10 words')).toBeVisible();
  await expect(page.getByText('1 run')).toBeVisible();
});

test('history rows fit a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await runTenWords(page);

  await page.goto('/history');
  await page.getByLabel('Show excluded runs').check();

  const row = page.locator('ul > li').first();
  await expect(row).toBeVisible();

  const box = await row.boundingBox();

  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
});

test('a history row opens the run detail with metrics and a personal best', async ({ page }) => {
  // A human-paced run clears the one-second exclusion threshold.
  await runTenWords(page, { delay: 40 });

  await page.getByRole('link', { name: 'History', exact: true }).click();
  await page.getByRole('link', { name: '10 words', exact: true }).click();

  await expect(page).toHaveURL(/\/results\/[^/]+$/);
  await expect(page.getByRole('heading', { name: /run detail/i })).toBeVisible();
  await expect(page.getByText('Net WPM', { exact: true })).toBeVisible();
  await expect(page.getByText('Raw WPM', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /speed over time/i })).toBeVisible();
  await expect(page.getByText(/averaged .* peak second/i)).toBeVisible();
  await expect(page.getByText('Personal best for this category.')).toBeVisible();
});

test('a missing run shows a recoverable state', async ({ page }) => {
  await page.goto('/results/does-not-exist');

  await expect(page.getByRole('heading', { name: /run not found/i })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByRole('link', { name: /local history/i })).toBeVisible();
});

test('an exported backup imports into a fresh browser', async ({ page, browser }) => {
  await runTenWords(page);

  const origin = new URL(page.url()).origin;

  await page.goto(`${origin}/settings`);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /export backup/i }).click();

  const download = await downloadPromise;
  const path = await download.path();

  expect(path).toBeTruthy();

  const freshContext = await browser.newContext();
  const freshPage = await freshContext.newPage();

  await freshPage.goto(`${origin}/settings`);
  await freshPage.setInputFiles('#import-backup', path);

  await expect(freshPage.getByText(/1 new run, 0 duplicates/i)).toBeVisible();

  await freshPage.getByRole('button', { name: 'Import 1 run' }).click();
  await expect(freshPage.getByText(/imported 1 new run/i)).toBeVisible();

  await freshPage.goto(`${origin}/history`);
  await freshPage.getByLabel('Show excluded runs').check();

  await expect(freshPage.getByText('10 words')).toBeVisible();
  await expect(freshPage.getByText('1 run')).toBeVisible();

  await freshContext.close();
});
