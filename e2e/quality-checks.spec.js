import { expect, test } from '@playwright/test';

test('adds a quality check through the main user flow', async ({ page, request }) => {
  // Reset checks before test to avoid accumulation
  await request.post('http://localhost:3000/api/test/reset-checks').catch(() => {
    // Endpoint might not be available, continue
  });
  
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Quality checks' })).toBeVisible();
  await page.getByLabel('Check name').fill('E2E flow');
  await page.getByRole('button', { name: 'Add check' }).click();
  await expect(page.getByText('E2E flow')).toBeVisible();
});
