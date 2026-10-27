import { expect, test } from '@playwright/test';

test('home page renders and primary navigation works', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /the typing bench/i })).toBeVisible();
  await expect(page.getByLabel('Typing input')).toBeAttached();

  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: /make the lab yours/i })).toBeVisible();

  await page.goto('/missing');
  await expect(page.getByRole('heading', { name: /not in the notebook/i })).toBeVisible();
});

test('a ten-word run completes and shows a result', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Words', exact: true }).click();
  await page.getByRole('button', { name: '10', exact: true }).click();

  const surface = page.getByTestId('typing-surface');
  await expect(surface).toHaveAttribute('data-status', 'idle');

  const words = (await page.locator('[data-word-index]').allTextContents()).slice(0, 10);

  expect(words).toHaveLength(10);

  await page.getByLabel('Typing input').focus();
  await page.keyboard.type(words.join(' '));

  const result = page.getByTestId('result-panel');
  await expect(result).toBeVisible();
  await expect(result.getByRole('heading', { name: /run complete/i })).toBeVisible();
  await expect(page.getByTestId('result-net-wpm')).toHaveText(/\d+/);
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
