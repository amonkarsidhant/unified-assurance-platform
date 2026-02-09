import { test, expect } from '@playwright/test';

test('demo UI loads and shows key heading', async ({ page }) => {
  await page.goto('/demo/site/');
  await expect(page.getByRole('heading', { name: 'Unified Assurance Platform' })).toBeVisible();
});
