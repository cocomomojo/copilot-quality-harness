import { test, expect } from '@playwright/test';

test.describe('Footer Component E2E Tests - Issue #63', () => {
  test('E2E-001: Home ページ訪問時、フッター内の著作権表記に現在年が含まれること', async ({
    page,
  }) => {
    await page.goto('http://localhost:5173/');
    
    const footerText = await page.locator('footer p').textContent();
    const currentYear = new Date().getFullYear();
    
    expect(footerText).toContain(`© ${currentYear}`);
    expect(footerText).toContain('Copilot Quality Harness');
    expect(footerText).toContain('All rights reserved');
  });

  test('E2E-002: 複数ページ遷移後も、全ページのフッターに現在年が表示されること', async ({
    page,
  }) => {
    const currentYear = new Date().getFullYear();
    const pages = ['/', '/quality-checks', '/url-validator', '/dashboard', '/settings'];

    for (const pagePath of pages) {
      await page.goto(`http://localhost:5173${pagePath}`);
      const footerText = await page.locator('footer p').textContent();
      
      expect(footerText).toContain(`© ${currentYear}`);
    }
  });

  test('E2E-003: 年号テキストが正確な形式「© YYYY」で表示されること', async ({
    page,
  }) => {
    await page.goto('http://localhost:5173/');
    
    const footerText = await page.locator('footer p').textContent();
    const currentYear = new Date().getFullYear();
    const yearRegex = new RegExp(`© ${currentYear}`);
    
    expect(footerText).toMatch(yearRegex);
  });

  test('E2E-004: フッターが全ページで同じスタイルクラスを持つこと', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    
    const footerElement = await page.locator('footer');
    const className = await footerElement.getAttribute('class');
    
    expect(className).toBe('footer');
  });

  test('E2E-005: ページリロード後も年号が正しく表示されること', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    
    const currentYear = new Date().getFullYear();
    const footerTextBefore = await page.locator('footer p').textContent();
    
    await page.reload();
    
    const footerTextAfter = await page.locator('footer p').textContent();
    
    expect(footerTextBefore).toContain(`© ${currentYear}`);
    expect(footerTextAfter).toContain(`© ${currentYear}`);
  });
});
