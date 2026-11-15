import { expect, test } from '@playwright/test';
import { API_BASE } from './helpers.js';

async function seedUser(request, email, password = 'Password123!', name = 'UI User') {
  const res = await request.post(`${API_BASE}/auth/register`, {
    data: { email, password, name },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.token).toBeTruthy();
  return body;
}

async function loginWithUi(page, email, password) {
  await page.goto('/login');
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(password);
  await page.getByTestId('login-button').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

test.describe('Web UI flows', () => {
  test('E2E-401 login page renders and redirects unauthenticated users', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    await expect(page.getByTestId('email-input')).toBeVisible();
    await expect(page.getByTestId('password-input')).toBeVisible();
  });

  test('E2E-402 register through UI succeeds and lands on dashboard', async ({ page }) => {
    const email = `ui-register-${Date.now()}@example.com`;
    await page.goto('/login');
    await page.getByTestId('toggle-auth-mode').click();
    await page.getByTestId('name-input').fill('UI Register User');
    await page.getByTestId('email-input').fill(email);
    await page.getByTestId('password-input').fill('Password123!');
    await page.getByTestId('register-button').click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('E2E-403 login through UI succeeds with existing account', async ({ request, page }) => {
    const email = `ui-login-${Date.now()}@example.com`;
    await seedUser(request, email, 'Password123!', 'UI Login User');

    await loginWithUi(page, email, 'Password123!');
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
  });

  test('E2E-404 create todo from UI and show it on list', async ({ request, page }) => {
    const email = `ui-todo-create-${Date.now()}@example.com`;
    await seedUser(request, email, 'Password123!', 'UI Todo User');
    await loginWithUi(page, email, 'Password123!');

    await page.goto('/todos');
    await page.getByTestId('todo-title-input').fill('UI Todo Title');
    await page.getByTestId('todo-description-input').fill('UI todo description');
    await page.getByTestId('todo-create-button').click();

    await expect(page.getByText('UI Todo Title')).toBeVisible();
    await expect(page.getByText('UI todo description')).toBeVisible();
  });

  test('E2E-405 update todo status from UI', async ({ request, page }) => {
    const email = `ui-todo-update-${Date.now()}@example.com`;
    await seedUser(request, email, 'Password123!', 'UI Update User');
    await loginWithUi(page, email, 'Password123!');

    await page.goto('/todos');
    await page.getByTestId('todo-title-input').fill('Status update task');
    await page.getByTestId('todo-description-input').fill('Will be marked complete');
    await page.getByTestId('todo-create-button').click();

    const firstItem = page.locator('.todo-item').first();
    const statusSelect = firstItem.getByRole('combobox');
    await statusSelect.selectOption('completed');
    await expect(statusSelect).toHaveValue('completed');
    await expect(firstItem.locator('.status-badge')).toHaveText('completed');
  });

  test('E2E-406 filter todo list by status and search query', async ({ request, page }) => {
    const email = `ui-todo-filter-${Date.now()}@example.com`;
    await seedUser(request, email, 'Password123!', 'UI Filter User');
    await loginWithUi(page, email, 'Password123!');

    await page.goto('/todos');
    await page.getByTestId('todo-title-input').fill('Alpha filter task');
    await page.getByTestId('todo-description-input').fill('Alpha description');
    await page.getByTestId('todo-create-button').click();

    await page.getByTestId('todo-title-input').fill('Beta filter task');
    await page.getByTestId('todo-description-input').fill('Beta description');
    await page.getByTestId('todo-create-button').click();

    await page.getByTestId('filter-status').selectOption('pending');
    await expect(page.getByText('Alpha filter task')).toBeVisible();
    await expect(page.getByText('Beta filter task')).toBeVisible();

    await page.getByTestId('search-input').fill('Alpha');
    await expect(page.getByText('Alpha filter task')).toBeVisible();
    await expect(page.getByText('Beta filter task')).toHaveCount(0);
  });

  test('E2E-407 delete todo from UI and remove it', async ({ request, page }) => {
    const email = `ui-todo-delete-${Date.now()}@example.com`;
    await seedUser(request, email, 'Password123!', 'UI Delete User');
    await loginWithUi(page, email, 'Password123!');

    await page.goto('/todos');
    await page.getByTestId('todo-title-input').fill('Delete me from UI');
    await page.getByTestId('todo-description-input').fill('To be removed');
    await page.getByTestId('todo-create-button').click();

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('Delete me from UI')).toHaveCount(0);
  });

  test('E2E-408 upload a file through UI and list it', async ({ request, page }) => {
    const email = `ui-file-upload-${Date.now()}@example.com`;
    await seedUser(request, email, 'Password123!', 'UI File User');
    await loginWithUi(page, email, 'Password123!');

    await page.goto('/files');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'ui-upload.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello from ui file upload'),
    });

    await expect(page.getByText('ui-upload.txt')).toBeVisible();
  });

  test('E2E-409 delete uploaded file from UI', async ({ request, page }) => {
    const email = `ui-file-delete-${Date.now()}@example.com`;
    await seedUser(request, email, 'Password123!', 'UI File Delete User');
    await loginWithUi(page, email, 'Password123!');

    await page.goto('/files');
    let uploadedFileId = '';
    const presignedResponsePromise = page.waitForResponse((response) => (
      response.url().includes('/api/files/presigned-url') && response.status() === 200
    ));
    const recordResponsePromise = page.waitForResponse((response) => (
      response.url().includes('/api/files/record-upload') && response.status() === 200
    ));
    await page.locator('input[type="file"]').setInputFiles({
      name: 'deleteme.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('delete me'),
    });
    const presignedResponse = await presignedResponsePromise;
    const presignedBody = await presignedResponse.json();
    uploadedFileId = presignedBody.fileId;
    await recordResponsePromise;
    const deleteButton = page.getByTestId(`file-delete-button-${uploadedFileId}`);
    await expect(deleteButton).toBeVisible({ timeout: 20000 });
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await deleteButton.click();
    await expect(page.getByText('deleteme.txt')).toHaveCount(0);
  });

  test('E2E-410 navigate between dashboard and TODO/files pages while authenticated', async ({ request, page }) => {
    const email = `ui-nav-${Date.now()}@example.com`;
    await seedUser(request, email, 'Password123!', 'UI Nav User');
    await loginWithUi(page, email, 'Password123!');

    await page.goto('/todos');
    await expect(page.getByTestId('todos-page')).toBeVisible();

    await page.goto('/files');
    await expect(page.getByTestId('files-page')).toBeVisible();

    await page.goto('/');
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
  });
});
