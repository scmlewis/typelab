import { expect, test } from '@playwright/test';

test('home page renders and primary navigation works', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /type with intent/i })).toBeVisible();

  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: /make the lab yours/i })).toBeVisible();

  await page.goto('/missing');
  await expect(page.getByRole('heading', { name: /not in the notebook/i })).toBeVisible();
});
