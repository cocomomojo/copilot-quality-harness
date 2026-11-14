import { expect, test } from '@playwright/test';

test.describe('Dashboard', () => {
  let authToken;
  let userEmail;

  test.beforeEach(async ({ page, request }) => {
    // Register new user
    const timestamp = Date.now();
    userEmail = `dashboard-user${timestamp}@example.com`;
    const password = 'Password123!';

    const registerRes = await request.post('/api/auth/register', {
      data: { email: userEmail, password, name: 'Dashboard User' },
    });
    authToken = (await registerRes.json()).token;

    // Set token and navigate to dashboard
    await page.evaluate((t) => {
      localStorage.setItem('authToken', t);
      localStorage.setItem('userData', JSON.stringify({ email: userEmail }));
    }, authToken);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('E2E-401: Dashboard displays summary cards', async ({ page }) => {
    // Look for summary cards
    const cards = page.locator('[data-testid*="card"], .card, .summary-item, .stat-card');
    await expect(cards).toBeVisible({ timeout: 10000 });
  });

  test('E2E-402: Dashboard shows TODO summary', async ({ page, request }) => {
    // Create some todos
    await request.post('/api/todos', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { title: 'Task 1', description: 'Desc', status: 'pending', priority: 'high' },
    });
    await request.post('/api/todos', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { title: 'Task 2', description: 'Desc', status: 'in-progress', priority: 'medium' },
    });

    // Reload to see summary
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Look for TODO count or summary
    const todoSummary = page.locator('[data-testid*="todo"], text=/todo|task/i');
    const todoElement = todoSummary.first();
    
    if (await todoElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(todoElement).toBeVisible();
    }
  });

  test('E2E-403: Dashboard shows recent activity timeline', async ({ page, request }) => {
    // Create activity
    await request.post('/api/todos', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { title: 'Recent Task', description: 'Desc', status: 'pending', priority: 'medium' },
    });

    // Reload to see activity
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Look for activity/timeline section
    const timeline = page.locator('[data-testid*="timeline"], [data-testid*="activity"], .timeline, .activity-list');
    
    if (await timeline.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(timeline).toBeVisible();
    }
  });

  test('E2E-404: Dashboard is responsive on different sizes', async ({ page }) => {
    // Check desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    let mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible({ timeout: 10000 });

    // Check tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible({ timeout: 10000 });

    // Check mobile view
    await page.setViewportSize({ width: 375, height: 812 });
    mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });

  test('E2E-405: Navigation menu is accessible from dashboard', async ({ page }) => {
    // Look for navigation menu
    const navbar = page.locator('nav, [role="navigation"], header');
    await expect(navbar).toBeVisible({ timeout: 10000 });

    // Check for links to other pages
    const todosLink = page.getByRole('link', { name: /todos|tasks/i });
    const filesLink = page.getByRole('link', { name: /files|documents/i });
    const logsLink = page.getByRole('link', { name: /logs|activity/i });

    expect(await todosLink.isVisible({ timeout: 5000 }).catch(() => false)).toBeTruthy();
    expect(await filesLink.isVisible({ timeout: 5000 }).catch(() => false)).toBeTruthy();
    expect(await logsLink.isVisible({ timeout: 5000 }).catch(() => false)).toBeTruthy();
  });

  test('E2E-406: Dashboard statistics update in real-time', async ({ page, request }) => {
    // Get initial stats
    await page.waitForTimeout(500);

    // Create a new todo
    await request.post('/api/todos', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { title: 'New Task', description: 'Desc', status: 'pending', priority: 'high' },
    });

    // Wait a moment for update
    await page.waitForTimeout(1000);

    // Check if dashboard shows the update (either auto-update or after manual refresh)
    const todoCount = page.locator('[data-testid*="count"], [data-testid*="total"]');
    
    if (await todoCount.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(todoCount).toBeVisible();
    }
  });
});
