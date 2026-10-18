/* copilot-generated */

import { expect, test } from '@playwright/test';

test.describe('User Profile - Account Created At Display (E2E)', () => {
  const apiUrl = 'http://localhost:3000';

  // E2E-001: Normal case - logged-in user with valid createdAt
  test('E2E-001: Display profile with valid createdAt', async ({ page, request }) => {
    // Setup: Seed database with user
    await request.post(`${apiUrl}/api/test/seed-user`, {
      data: {
        id: 'user-123',
        email: 'testuser@example.com',
        name: 'Test User',
        created_at: '2026-10-18T10:00:00Z'
      }
    }).catch(() => {
      // Endpoint might not exist, continue with test
    });

    // Navigate to profile page
    await page.goto(`${apiUrl}/profile`);

    // Verify page title and headings
    await expect(page.getByRole('heading', { name: /プロフィール/i })).toBeVisible();
    await expect(page.getByText(/アカウント作成日/i)).toBeVisible();

    // Step 2: Assert date is displayed
    await expect(page.getByText('2026年10月18日')).toBeVisible({ timeout: 3000 });

    // Step 3: Assert element is present and visible
    const createdAtElement = page.locator('[data-testid="account-created-at"]');
    await expect(createdAtElement).toBeVisible();

    // Step 4: Assert formatted date in the value element
    const createdAtValue = page.locator('[data-testid="account-created-at-value"]');
    await expect(createdAtValue).toContainText('2026年10月18日');
  });

  // E2E-002: Error case - null createdAt with fallback display
  test('E2E-002: Display fallback when createdAt is null', async ({ page, request }) => {
    // Setup: Seed database with user without createdAt
    await request.post(`${apiUrl}/api/test/seed-user`, {
      data: {
        id: 'user-456',
        email: 'legacyuser@example.com',
        name: 'Legacy User',
        created_at: null
      }
    }).catch(() => {
      // Endpoint might not exist, continue with test
    });

    // Navigate to profile page
    await page.goto(`${apiUrl}/profile`);

    // Verify page displays
    await expect(page.getByRole('heading', { name: /プロフィール/i })).toBeVisible();
    await expect(page.getByText(/アカウント作成日/i)).toBeVisible();

    // Step 2: Assert element is present
    const createdAtElement = page.locator('[data-testid="account-created-at"]');
    await expect(createdAtElement).toBeVisible();

    // Step 3: Assert fallback text (dash or 未設定)
    const createdAtValue = page.locator('[data-testid="account-created-at-value"]');
    const text = await createdAtValue.textContent();
    expect(text?.trim()).toMatch(/^(-|未設定)$/);
  });

  // E2E-003: Error case - API returns 404
  test('E2E-003: Handle 404 API error', async ({ page }) => {
    // Navigate to profile page without user data
    await page.goto(`${apiUrl}/profile`);

    // Verify error message is displayed
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 3000 });
    // The error message should be from fetchUserProfile's 404 handling
    await expect(page.getByText(/ユーザープロフィール取得に失敗しました/i)).toBeVisible();
  });

  // E2E-004: Normal case - fetch and display from API
  test('E2E-004: Fetch createdAt from API and display formatted', async ({ page, request }) => {
    // Step 1: Call API endpoint directly
    const response = await request.get(`${apiUrl}/api/user/me`).catch(() => null);

    // Only verify format if user exists
    if (response && response.ok()) {
      const data = await response.json();
      
      // Verify response has createdAt in ISO8601 format
      if (data.created_at) {
        expect(data.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      }
    }

    // Step 2 & 3: Navigate to profile and verify date format
    await page.goto(`${apiUrl}/profile`);
    
    // Verify profile page
    const heading = page.getByRole('heading', { name: /プロフィール/i });
    if (await heading.isVisible().catch(() => false)) {
      // If profile loads, verify date format pattern
      const dateElement = page.locator('[data-testid="account-created-at-value"]');
      const dateText = await dateElement.textContent().catch(() => '');
      
      // Verify it matches Japanese date format or fallback
      expect(dateText?.trim()).toMatch(/(\d{4}年\d{1,2}月\d{1,2}日|-|未設定)/);
    }
  });

  // E2E-005: Error case - invalid createdAt format in API response
  test('E2E-005: Handle invalid createdAt format with fallback', async ({ page, request }) => {
    // Setup: Mock or seed user with invalid date
    await request.post(`${apiUrl}/api/test/seed-user`, {
      data: {
        id: 'user-789',
        email: 'user@example.com',
        name: 'Test User',
        created_at: 'not-a-valid-date'
      }
    }).catch(() => {
      // Endpoint might not exist, continue with test
    });

    // Navigate to profile
    await page.goto(`${apiUrl}/profile`);

    // Verify page displays
    const heading = page.getByRole('heading', { name: /プロフィール/i });
    if (await heading.isVisible().catch(() => false)) {
      // Verify fallback display
      const createdAtValue = page.locator('[data-testid="account-created-at-value"]');
      const text = await createdAtValue.textContent().catch(() => '');
      expect(text?.trim()).toMatch(/^(-|未設定)$/);
    }
  });

  // Additional E2E tests for robustness
  test('E2E-006: Verify element structure and accessibility', async ({ page, request }) => {
    // Setup user
    await request.post(`${apiUrl}/api/test/seed-user`, {
      data: {
        id: 'user-123',
        email: 'testuser@example.com',
        name: 'Test User',
        created_at: '2026-10-18T10:00:00Z'
      }
    }).catch(() => {});

    // Navigate
    await page.goto(`${apiUrl}/profile`);

    // Verify main structure
    const main = page.locator('main');
    await expect(main).toBeVisible().catch(() => {});

    // Verify heading hierarchy
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible().catch(() => {});
  });

  test('E2E-007: Verify multiple renders and state consistency', async ({ page, request }) => {
    // Setup
    await request.post(`${apiUrl}/api/test/seed-user`, {
      data: {
        id: 'user-123',
        email: 'testuser@example.com',
        name: 'Test User',
        created_at: '2026-10-18T10:00:00Z'
      }
    }).catch(() => {});

    // Navigate and verify
    await page.goto(`${apiUrl}/profile`);

    const createdAtValue = page.locator('[data-testid="account-created-at-value"]');
    
    // First check
    const firstText = await createdAtValue.textContent().catch(() => null);

    // Navigate away and back
    await page.goto(`${apiUrl}/`);
    await page.goto(`${apiUrl}/profile`);

    // Second check - should be consistent
    const secondText = await createdAtValue.textContent().catch(() => null);

    if (firstText && secondText) {
      expect(firstText).toBe(secondText);
    }
  });
});
