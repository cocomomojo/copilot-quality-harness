/* copilot-generated */

import { expect, test } from '@playwright/test';

test.describe('URL Validator API', () => {
  const apiUrl = 'http://127.0.0.1:3000/api/validators/check-url';

  // E2E-001: Valid HTTPS URL check
  test('E2E-001: Check valid HTTPS URL endpoint', async ({ page }) => {
    const response = await page.request.post(apiUrl, {
      data: { url: 'https://example.com' }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(true);
    expect(body.error).toBeUndefined();
  });

  // E2E-002: Invalid URL format
  test('E2E-002: Check invalid URL format', async ({ page }) => {
    const response = await page.request.post(apiUrl, {
      data: { url: 'not-a-valid-url' }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(false);
    expect(body.error).toBe('Invalid URL format');
  });

  // E2E-003: Empty string input
  test('E2E-003: Check empty string input', async ({ page }) => {
    const response = await page.request.post(apiUrl, {
      data: { url: '' }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(false);
    expect(body.error).toBe('URL cannot be empty');
  });

  // E2E-004: Null input
  test('E2E-004: Check null input', async ({ page }) => {
    const response = await page.request.post(apiUrl, {
      data: { url: null }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(false);
    expect(body.error).toBe('URL cannot be empty');
  });

  // Additional E2E tests
  test('E2E-005: Check valid HTTP URL with port', async ({ page }) => {
    const response = await page.request.post(apiUrl, {
      data: { url: 'http://localhost:3000/api/health' }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(true);
  });

  test('E2E-006: Check valid GitHub URL', async ({ page }) => {
    const response = await page.request.post(apiUrl, {
      data: { url: 'https://github.com/cocomomojo/copilot-quality-harness' }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(true);
  });

  test('E2E-007: Check FTP protocol (not allowed)', async ({ page }) => {
    const response = await page.request.post(apiUrl, {
      data: { url: 'ftp://files.example.com/file.txt' }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(false);
    expect(body.error).toBe('Invalid URL format');
  });

  test('E2E-008: Response time performance check', async ({ page }) => {
    const startTime = Date.now();
    
    const response = await page.request.post(apiUrl, {
      data: { url: 'https://example.com' }
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(100); // Should respond in < 100ms
  });
});
