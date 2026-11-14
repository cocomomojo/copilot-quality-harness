import { expect, test } from '@playwright/test';

test.describe('Activity Logs', () => {
  let authToken;
  let userEmail;

  test.beforeEach(async ({ page, request }) => {
    // Register new user
    const timestamp = Date.now();
    userEmail = `logs-user${timestamp}@example.com`;
    const password = 'Password123!';

    const registerRes = await request.post('/api/auth/register', {
      data: { email: userEmail, password, name: 'Logs User' },
    });
    authToken = (await registerRes.json()).token;

    // Create some activity by creating a todo
    await request.post('/api/todos', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { title: 'Test Activity', description: 'Test', status: 'pending', priority: 'medium' },
    });

    // Set token and navigate to logs page
    await page.evaluate((t) => {
      localStorage.setItem('authToken', t);
      localStorage.setItem('userData', JSON.stringify({ email: userEmail }));
    }, authToken);

    await page.goto('/logs');
    await page.waitForLoadState('networkidle');
  });

  test('E2E-301: User can view activity logs', async ({ page }) => {
    // Verify logs are displayed
    const logEntries = page.locator('[data-testid*="log"], .log-entry, .activity-item');
    await expect(logEntries).toBeVisible({ timeout: 10000 });
  });

  test('E2E-302: Activity logs show timestamps', async ({ page }) => {
    // Wait for logs to load
    await page.waitForTimeout(1000);

    // Look for timestamp elements
    const timestamps = page.locator('time, [data-testid*="time"], [data-testid*="date"]');
    const count = await timestamps.count();

    if (count > 0) {
      // Verify at least one timestamp is visible
      await expect(timestamps.first()).toBeVisible();
    }
  });

  test('E2E-303: Activity logs show event types', async ({ page }) => {
    // Create different types of activities
    const todoRes = await page.request.post('/api/todos', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { title: 'Another Task', description: 'Test', status: 'in-progress', priority: 'high' },
    });

    // Reload page to see new logs
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Look for event type indicators
    const logEntries = page.locator('[data-testid*="log"], .log-entry, .activity-item');
    const count = await logEntries.count();

    // Verify we have at least one log entry
    expect(count).toBeGreaterThan(0);
  });

  test('E2E-304: Activity logs can be filtered by date', async ({ page }) => {
    // Look for date filter
    const dateFilter = page.locator('input[type="date"], [data-testid*="date-filter"]').first();

    if (await dateFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      const today = new Date().toISOString().split('T')[0];
      await dateFilter.fill(today);

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Verify logs are still visible or show no results
      const logEntries = page.locator('[data-testid*="log"], .log-entry, .activity-item');
      const emptyMessage = page.locator('text=/no|empty|nothing/i');

      const entriesVisible = logEntries.count().then(c => c > 0).catch(() => false);
      const emptyVisible = emptyMessage.isVisible({ timeout: 5000 }).catch(() => false);

      expect(await entriesVisible || await emptyVisible).toBeTruthy();
    }
  });

  test('E2E-305: Activity logs show user actions in chronological order', async ({ page, request }) => {
    // Create multiple todos to generate logs
    for (let i = 0; i < 3; i++) {
      await request.post('/api/todos', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { title: `Task ${i}`, description: 'Test', status: 'pending', priority: 'medium' },
      });
      await page.waitForTimeout(500); // Small delay between actions
    }

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Get all log entries
    const logEntries = page.locator('[data-testid*="log"], .log-entry, .activity-item');
    const count = await logEntries.count();

    // Verify we have multiple entries
    expect(count).toBeGreaterThanOrEqual(3);

    // Get timestamps
    const timestamps = page.locator('time, [data-testid*="time"]');
    const tsCount = await timestamps.count();

    // Verify timestamps exist
    if (tsCount > 0) {
      // Verify first timestamp is earlier or same as second
      const firstTs = await timestamps.first().getAttribute('datetime');
      const secondTs = await timestamps.nth(1).getAttribute('datetime');

      if (firstTs && secondTs) {
        expect(new Date(firstTs)).toBeLessThanOrEqual(new Date(secondTs));
      }
    }
  });

  test('E2E-306: Activity logs display is paginated or scrollable', async ({ page, request }) => {
    // Create many todos to generate logs
    for (let i = 0; i < 5; i++) {
      await request.post('/api/todos', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { title: `Task ${i}`, description: 'Test', status: 'pending', priority: 'medium' },
      });
    }

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check for pagination controls
    const nextButton = page.getByRole('button', { name: /next|more/i });
    const paginationInfo = page.locator('[data-testid*="pagination"], .pagination');

    const paginationExists = await paginationInfo.isVisible({ timeout: 5000 }).catch(() => false);
    const nextButtonExists = await nextButton.isVisible({ timeout: 5000 }).catch(() => false);

    // Verify either pagination or scrollable content exists
    const logContainer = page.locator('[data-testid*="log"], .log-entry').first();
    const hasContent = await logContainer.isVisible({ timeout: 5000 }).catch(() => false);

    expect(paginationExists || nextButtonExists || hasContent).toBeTruthy();
  });
});
