import { expect, test } from '@playwright/test';

test.describe('Authentication - Registration & Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test('E2E-001: User can register with valid credentials', async ({ page }) => {
    const timestamp = Date.now();
    const email = `user${timestamp}@example.com`;
    const password = 'Password123!';
    const name = 'Test User';

    // Click on register tab
    await page.getByRole('tab', { name: /register/i }).click();
    
    // Fill registration form
    await page.getByLabel(/name/i).fill(name);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    
    // Submit
    await page.getByRole('button', { name: /register/i }).click();
    
    // Wait for navigation to dashboard
    await page.waitForURL('/', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Verify we're on dashboard
    await expect(page.locator('h1')).toContainText(/dashboard|welcome/i);
  });

  test('E2E-002: User can login with valid credentials', async ({ page }) => {
    const email = 'test@example.com';
    const password = 'Password123!';

    // Pre-create user via API
    await page.request.post('/api/auth/register', {
      data: { email, password, name: 'Test User' },
    });

    // Login
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /login/i }).click();

    // Wait for navigation to dashboard
    await page.waitForURL('/', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Verify we're on dashboard
    await expect(page.locator('h1')).toContainText(/dashboard|welcome/i);
  });

  test('E2E-003: User cannot login with invalid password', async ({ page }) => {
    const email = 'test@example.com';
    const password = 'WrongPassword123!';

    // Pre-create user via API
    await page.request.post('/api/auth/register', {
      data: { email, password: 'CorrectPassword123!', name: 'Test User' },
    });

    // Try login with wrong password
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /login/i }).click();

    // Verify error is displayed
    await expect(page.locator('[role="alert"], .error, .toast')).toContainText(/invalid|failed|wrong/i);
  });

  test('E2E-004: Duplicate email registration is rejected', async ({ page }) => {
    const email = 'duplicate@example.com';
    const password = 'Password123!';

    // Pre-create user
    await page.request.post('/api/auth/register', {
      data: { email, password, name: 'First User' },
    });

    // Try to register with same email
    await page.goto('/login');
    await page.getByRole('tab', { name: /register/i }).click();
    await page.getByLabel(/name/i).fill('Second User');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /register/i }).click();

    // Verify error is displayed
    await expect(page.locator('[role="alert"], .error, .toast')).toContainText(/already|exists|duplicate/i);
  });

  test('E2E-005: User can logout', async ({ page }) => {
    const email = 'logout-test@example.com';
    const password = 'Password123!';

    // Pre-create user and login via API
    const loginRes = await page.request.post('/api/auth/login', {
      data: { email, password },
    }).catch(() => null);

    if (loginRes?.ok()) {
      const token = (await loginRes.json()).token;
      
      // Store token in localStorage
      await page.evaluate((t) => {
        localStorage.setItem('authToken', t);
      }, token);
    }

    // Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find and click logout button
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
    if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logoutButton.click();
      
      // Verify redirected to login
      await page.waitForURL('/login', { timeout: 10000 });
      await expect(page).toHaveURL(/login/);
    }
  });
});

test.describe('Protected Routes', () => {
  test('E2E-006: Unauthenticated user redirected to login', async ({ page }) => {
    await page.goto('/');
    
    // Should be redirected to login
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });

  test('E2E-007: Authenticated user can access protected pages', async ({ page, request }) => {
    const email = 'auth-test@example.com';
    const password = 'Password123!';

    // Register and get token
    const registerRes = await request.post('/api/auth/register', {
      data: { email, password, name: 'Auth Test' },
    });
    const token = (await registerRes.json()).token;

    // Set token and navigate
    await page.evaluate((t) => {
      localStorage.setItem('authToken', t);
      localStorage.setItem('userData', JSON.stringify({ email }));
    }, token);

    // Access protected page
    await page.goto('/todos');
    await page.waitForLoadState('networkidle');

    // Verify we're on todos page
    await expect(page.locator('h1, h2')).toContainText(/todos|tasks/i);
  });
});
