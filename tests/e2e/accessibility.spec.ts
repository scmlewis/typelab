import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function analyse(page: Page, include?: string) {
  const builder = new AxeBuilder({ page }).withTags(TAGS);

  if (include !== undefined) {
    builder.include(include);
  }

  return builder.analyze();
}

async function runTenWords(page: Page) {
  await page.getByRole('button', { name: 'Words', exact: true }).click();
  await page.getByRole('button', { name: '10', exact: true }).click();

  const words = (await page.locator('[data-word-index]').allTextContents()).slice(0, 10);

  await page.getByLabel('Typing input').focus();
  await page.keyboard.type(words.join(' '), { delay: 40 });
  await expect(page.getByTestId('result-panel')).toBeVisible();
}

test('the bench, settings, and history have no detectable WCAG A/AA violations', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /the typing bench/i })).toBeVisible();

  const bench = await analyse(page);

  expect(bench.violations, format(bench.violations)).toEqual([]);

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: /make the lab yours/i })).toBeVisible();

  const settings = await analyse(page);

  expect(settings.violations, format(settings.violations)).toEqual([]);

  await page.goto('/history');
  await expect(page.getByRole('heading', { name: /local history/i })).toBeVisible();

  const history = await analyse(page);

  expect(history.violations, format(history.violations)).toEqual([]);
});

test('a finished run and its share panel are accessible', async ({ page }) => {
  await page.goto('/');
  await runTenWords(page);

  const result = await analyse(page, '[data-testid="result-panel"]');

  expect(result.violations, format(result.violations)).toEqual([]);
});

test('a shared snapshot page is accessible without local history', async ({ page }) => {
  await page.goto('/');
  await runTenWords(page);

  const link = await page.getByLabel('Share link').inputValue();

  await page.goto(link);
  await expect(page.getByRole('heading', { name: /a result from the bench/i })).toBeVisible();

  const shared = await analyse(page);

  expect(shared.violations, format(shared.violations)).toEqual([]);
});

test('the reduced-motion preference is reflected on the document', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Reduced', exact: true }).click();

  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');

  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  await expect(page.getByTestId('typing-caret')).toHaveCSS('animation-name', 'none');
});

function format(violations: { id: string; help: string; nodes: unknown[] }[]): string {
  return violations
    .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`)
    .join('\n');
}
