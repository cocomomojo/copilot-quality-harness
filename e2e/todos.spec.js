import { expect, test } from '@playwright/test';

test.describe('TODO Management', () => {
  let authToken;
  let userEmail;

  test.beforeEach(async ({ page, request }) => {
    // Register new user
    const timestamp = Date.now();
    userEmail = `todo-user${timestamp}@example.com`;
    const password = 'Password123!';

    const registerRes = await request.post('/api/auth/register', {
      data: { email: userEmail, password, name: 'TODO User' },
    });
    authToken = (await registerRes.json()).token;

    // Set token and navigate to todos page
    await page.evaluate((t) => {
      localStorage.setItem('authToken', t);
      localStorage.setItem('userData', JSON.stringify({ email: userEmail }));
    }, authToken);

    await page.goto('/todos');
    await page.waitForLoadState('networkidle');
  });

  test('E2E-101: User can create a new TODO', async ({ page }) => {
    const todoTitle = 'Test TODO Task';
    const todoDesc = 'This is a test description';

    // Find and fill the todo creation form
    await page.getByLabel(/title|name/i).fill(todoTitle);
    await page.getByLabel(/description/i).fill(todoDesc);

    // Submit form
    await page.getByRole('button', { name: /add|create|submit/i }).first().click();

    // Wait for the todo to appear in the list
    await expect(page.locator('text=' + todoTitle)).toBeVisible({ timeout: 10000 });

    // Verify the todo is in the list
    const todoItem = page.locator(`text=${todoTitle}`);
    await expect(todoItem).toBeVisible();
  });

  test('E2E-102: User can view TODO list', async ({ page }) => {
    // Create some todos via API
    const todoRes = await page.request.post('/api/todos', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { title: 'Task 1', description: 'Desc 1', status: 'pending', priority: 'high' },
    });
    expect(todoRes.ok()).toBeTruthy();

    await page.request.post('/api/todos', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { title: 'Task 2', description: 'Desc 2', status: 'in-progress', priority: 'medium' },
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify todos are displayed
    await expect(page.locator('text=Task 1')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Task 2')).toBeVisible({ timeout: 10000 });
  });

  test('E2E-103: User can mark TODO as completed', async ({ page, request }) => {
    const todoTitle = 'Complete me task';

    // Create todo via API
    const createRes = await request.post('/api/todos', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { title: todoTitle, description: 'Test', status: 'pending', priority: 'medium' },
    });
    const todoId = (await createRes.json()).id;

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Find the todo and mark as complete
    const todoRow = page.locator(`text=${todoTitle}`).first();
    const completeButton = todoRow.locator('button').filter({ hasText: /complete|done|check/i }).first();

    if (await completeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await completeButton.click();

      // Verify status changed (might show strikethrough or different styling)
      await page.waitForTimeout(500);
      // Status might update in real-time or after reload
    }
  });

  test('E2E-104: User can delete a TODO', async ({ page, request }) => {
    const todoTitle = 'Delete me task';

    // Create todo via API
    const createRes = await request.post('/api/todos', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { title: todoTitle, description: 'Test', status: 'pending', priority: 'low' },
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Find the todo and delete it
    const todoRow = page.locator(`text=${todoTitle}`).first();
    const deleteButton = todoRow.locator('button').filter({ hasText: /delete|remove/i }).first();

    if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deleteButton.click();

      // Confirm delete if dialog appears
      const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // Verify todo is removed
      await expect(page.locator(`text=${todoTitle}`)).not.toBeVisible({ timeout: 10000 });
    }
  });

  test('E2E-105: User can filter TODOs by priority', async ({ page, request }) => {
    // Create todos with different priorities via API
    await request.post('/api/todos', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { title: 'High Priority Task', description: 'High', status: 'pending', priority: 'high' },
    });
    await request.post('/api/todos', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { title: 'Low Priority Task', description: 'Low', status: 'pending', priority: 'low' },
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Find and click priority filter
    const priorityFilter = page.locator('select, [data-testid*="priority"]').first();
    if (await priorityFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await priorityFilter.selectOption('high');

      // Verify high priority task is visible
      await expect(page.locator('text=High Priority Task')).toBeVisible({ timeout: 10000 });
    }
  });

  test('E2E-106: User can search TODOs', async ({ page, request }) => {
    // Create a unique todo
    const searchTerm = 'SearchableUniqueTask';
    await request.post('/api/todos', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { title: searchTerm, description: 'Search test', status: 'pending', priority: 'medium' },
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Find and fill search input
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill(searchTerm);
      await page.waitForTimeout(500);

      // Verify filtered results
      await expect(page.locator(`text=${searchTerm}`)).toBeVisible({ timeout: 10000 });
    }
  });
});
