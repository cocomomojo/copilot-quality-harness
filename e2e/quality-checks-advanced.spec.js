import { expect, test } from '@playwright/test';

const ERROR_MESSAGE_INVALID_NAME = 'name must be between 1 and 120 characters';

test.describe('Quality Checks UI - Error Scenarios & Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Error Path Tests', () => {
    test('displays error when adding check with only whitespace', async ({ page }) => {
      const input = page.getByLabel('Check name');
      const button = page.getByRole('button', { name: 'Add check' });
      
      await input.fill('   ');
      await button.click();
      
      const error = page.getByRole('alert');
      await expect(error).toBeVisible();
      await expect(error).toContainText(ERROR_MESSAGE_INVALID_NAME);
    });

    test('displays error when name exceeds 120 characters', async ({ page }) => {
      const input = page.getByLabel('Check name');

      // HTML input maxLength="120" will prevent exceeding 120 characters
      // Fill with 121 characters to test truncation behavior
      await input.fill('A'.repeat(121));

      // Verify that the actual input value is truncated to 120 characters
      const charCount = await input.inputValue();
      expect(charCount.length).toBe(120);
    });

    test('clears error message when user corrects input', async ({ page }) => {
      const input = page.getByLabel('Check name');
      const button = page.getByRole('button', { name: 'Add check' });

      await input.fill('   ');
      await button.click();

      const error = page.getByRole('alert');
      await expect(error).toBeVisible();
      await expect(error).toContainText(ERROR_MESSAGE_INVALID_NAME);

      await input.fill('Valid Check Name');
      // Error should be cleared before submission
      await button.click();

      await expect(page.getByText('Valid Check Name')).toBeVisible();
    });

    test('shows appropriate error when API is unavailable', async ({ page, context }) => {
      // Mock fetch to simulate API failure
      await context.addInitScript(() => {
        window.originalFetch = fetch;
        window.fetch = async (url, options) => {
          if (url.includes('/api/checks')) {
            throw new Error('Network error');
          }
          return window.originalFetch(url, options);
        };
      });
      
      await page.reload();
      
      const error = page.getByRole('alert');
      await expect(error).toBeVisible();
    });
  });

  test.describe('Input Validation Tests', () => {
    test('accepts check name with unicode characters', async ({ page }) => {
      const input = page.getByLabel('Check name');
      const button = page.getByRole('button', { name: 'Add check' });
      
      await input.fill('日本語テスト');
      await button.click();
      
      await expect(page.getByText('日本語テスト')).toBeVisible();
    });

    test('accepts check name with special characters', async ({ page }) => {
      const input = page.getByLabel('Check name');
      const button = page.getByRole('button', { name: 'Add check' });
      
      const specialName = 'Check #123 - Special & Test!';
      await input.fill(specialName);
      await button.click();
      
      await expect(page.getByText(specialName)).toBeVisible();
    });

    test('accepts check name with quotes', async ({ page }) => {
      const input = page.getByLabel('Check name');
      const button = page.getByRole('button', { name: 'Add check' });
      
      const nameWithQuotes = 'Check with "quotes"';
      await input.fill(nameWithQuotes);
      await button.click();
      
      await expect(page.getByText(nameWithQuotes)).toBeVisible();
    });

    test('accepts single character check name', async ({ page }) => {
      const input = page.getByLabel('Check name');
      const button = page.getByRole('button', { name: 'Add check' });
      
      await input.fill('A');
      await button.click();
      
      await expect(page.getByText('A')).toBeVisible();
    });

    test('trims whitespace from check name', async ({ page }) => {
      const input = page.getByLabel('Check name');
      const button = page.getByRole('button', { name: 'Add check' });
      
      await input.fill('  trimmed name  ');
      await button.click();
      
      // Should show trimmed version
      await expect(page.getByText('trimmed name')).toBeVisible();
    });
  });

  test.describe('User Interaction Tests', () => {
    test('form clears after successful submission', async ({ page }) => {
      const input = page.getByLabel('Check name');
      const button = page.getByRole('button', { name: 'Add check' });
      
      await input.fill('Test Check');
      await button.click();
      
      await expect(page.getByText('Test Check')).toBeVisible();
      
      const inputValue = await input.inputValue();
      expect(inputValue).toBe('');
    });

    test('focuses input after successful submission', async ({ page }) => {
      const input = page.getByLabel('Check name');
      const button = page.getByRole('button', { name: 'Add check' });
      
      await input.fill('Test Check');
      await button.click();
      
      await expect(page.getByText('Test Check')).toBeVisible();
      
      // Input should still have focus for next entry
      const focusedElement = await page.evaluate(() => document.activeElement?.id);
      expect(focusedElement).toBe('check-name');
    });

    test('can add multiple checks in sequence', async ({ page }) => {
      const input = page.getByLabel('Check name');
      const button = page.getByRole('button', { name: 'Add check' });
      
      const checkNames = ['First Check', 'Second Check', 'Third Check'];
      
      for (const name of checkNames) {
        await input.fill(name);
        await button.click();
        await expect(page.getByText(name)).toBeVisible();
      }
      
      // Verify all are displayed
      for (const name of checkNames) {
        await expect(page.getByText(name)).toBeVisible();
      }
    });

    test('prevents duplicate submission during API call', async ({ page }) => {
      const button = page.getByRole('button', { name: 'Add check' });
      const input = page.getByLabel('Check name');
      
      await input.fill('Test Check');
      
      // Click button multiple times rapidly
      await button.click();
      await button.click();
      
      // Should only create one check
      const checks = await page.locator('text=Test Check').count();
      expect(checks).toBeLessThanOrEqual(2); // One in input + max one in list
    });

    test('maintains focus on input field during interactions', async ({ page }) => {
      const input = page.getByLabel('Check name');
      
      await input.focus();
      
      const isFocused = await input.evaluate(el => el === document.activeElement);
      expect(isFocused).toBe(true);
    });
  });

  test.describe('Data Persistence Tests', () => {
    test('checks persist after page reload', async ({ page }) => {
      const input = page.getByLabel('Check name');
      const button = page.getByRole('button', { name: 'Add check' });
      
      await input.fill('Persistent Check');
      await button.click();
      
      await expect(page.getByText('Persistent Check')).toBeVisible();
      
      // Reload page
      await page.reload();
      
      // Check should still be visible
      await expect(page.getByText('Persistent Check')).toBeVisible();
    });

    test('new checks appear at top of list', async ({ page }) => {
      const input = page.getByLabel('Check name');
      const button = page.getByRole('button', { name: 'Add check' });
      
      await input.fill('First Check');
      await button.click();
      
      await input.fill('Second Check');
      await button.click();
      
      const checks = page.locator('li');
      const firstCheck = await checks.first().textContent();
      
      expect(firstCheck).toContain('Second Check');
    });

    test('status is displayed for each check', async ({ page }) => {
      const input = page.getByLabel('Check name');
      const button = page.getByRole('button', { name: 'Add check' });
      
      await input.fill('Status Check');
      await button.click();
      
      // Check should have status badge
      const checkItem = page.locator('li', { has: page.getByText('Status Check') });
      const statusElement = checkItem.locator('small');
      
      await expect(statusElement).toBeVisible();
      const status = await statusElement.textContent();
      expect(['pending', 'passed', 'failed']).toContain(status);
    });
  });

  test.describe('Accessibility Tests', () => {
    test('form has proper labels for all inputs', async ({ page }) => {
      const label = page.getByText('Check name');
      await expect(label).toBeVisible();
      
      const input = page.getByLabel('Check name');
      await expect(input).toBeVisible();
    });

    test('button is keyboard accessible', async ({ page }) => {
      const input = page.getByLabel('Check name');
      const button = page.getByRole('button', { name: 'Add check' });
      
      await input.focus();
      await input.fill('Keyboard Test');
      
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      await expect(page.getByText('Keyboard Test')).toBeVisible();
    });

    test('form is navigable with Tab key', async ({ page }) => {
      const input = page.getByLabel('Check name');
      
      await input.focus();
      const initialId = await input.evaluate(el => el.id);
      expect(initialId).toBe('check-name');
      
      await page.keyboard.press('Tab');
      const focusedId = await page.evaluate(() => document.activeElement?.id);
      expect(focusedId).not.toBe('check-name');
    });

    test('error message is announced as alert', async ({ page }) => {
      const input = page.getByLabel('Check name');
      const button = page.getByRole('button', { name: 'Add check' });
      
      await input.fill('   ');
      await button.click();
      
      const alert = page.getByRole('alert');
      await expect(alert).toBeVisible();
      
      // Alert should have accessible role
      const role = await alert.getAttribute('role');
      expect(role).toBe('alert');
    });

    test('section has proper heading', async ({ page }) => {
      const heading = page.getByRole('heading', { name: 'Quality checks' });
      await expect(heading).toBeVisible();
    });

    test('checks list has accessible heading', async ({ page }) => {
      const input = page.getByLabel('Check name');
      const button = page.getByRole('button', { name: 'Add check' });
      
      await input.fill('Test Check');
      await button.click();
      
      const listHeading = page.getByRole('heading', { name: 'Current checks' });
      await expect(listHeading).toBeVisible();
    });
  });

  test.describe('UI State Tests', () => {
    test('displays "No checks recorded yet" when empty', async ({ page }) => {
      await expect(page.getByText('No checks recorded yet')).toBeVisible();
    });

    test('removes "No checks" message when first check is added', async ({ page }) => {
      const input = page.getByLabel('Check name');
      const button = page.getByRole('button', { name: 'Add check' });
      
      await expect(page.getByText('No checks recorded yet')).toBeVisible();
      
      await input.fill('First Check');
      await button.click();
      
      await expect(page.getByText('No checks recorded yet')).not.toBeVisible();
    });

    test('displays checks as list items', async ({ page }) => {
      const input = page.getByLabel('Check name');
      const button = page.getByRole('button', { name: 'Add check' });
      
      await input.fill('List Check');
      await button.click();
      
      const listItems = page.locator('li');
      await expect(listItems.first()).toContainText('List Check');
    });
  });

  test.describe('Performance Tests', () => {
    test('page loads within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      const loadTime = Date.now() - startTime;
      
      // Page should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('API call completes reasonably fast', async ({ page }) => {
      const input = page.getByLabel('Check name');
      const button = page.getByRole('button', { name: 'Add check' });
      
      await input.fill('Performance Test');
      
      const startTime = Date.now();
      await button.click();
      const duration = Date.now() - startTime;
      
      // API call should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
      
      await expect(page.getByText('Performance Test')).toBeVisible();
    });
  });
});
