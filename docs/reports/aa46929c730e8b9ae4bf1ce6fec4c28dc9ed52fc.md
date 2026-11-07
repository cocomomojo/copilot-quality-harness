# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: quality-checks-advanced.spec.js >> Quality Checks UI - Error Scenarios & Edge Cases >> UI State Tests >> removes "No checks" message when first check is added
- Location: e2e/quality-checks-advanced.spec.js:334:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('No checks recorded yet.')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('No checks recorded yet.') with timeout 5000ms
  - waiting for getByText('No checks recorded yet.')

```

```yaml
- banner:
  - heading "Copilot Quality Harness" [level=1]
  - navigation:
    - list:
      - listitem:
        - link "Home":
          - /url: /
      - listitem:
        - link "Quality Checks":
          - /url: /quality-checks
      - listitem:
        - link "URL Validator":
          - /url: /url-validator
      - listitem:
        - link "Dashboard":
          - /url: /dashboard
      - listitem:
        - link "Settings":
          - /url: /settings
- main:
  - heading "アプリケーション概要" [level=2]
  - paragraph: Copilot Quality Harness は、自動テスト生成・実行・レポート機能を備えた品質保証ツールです。
  - heading "🔍 品質チェック" [level=3]
  - paragraph: カスタム品質チェック機能で、アプリケーションの品質を即座に検証できます。
  - heading "🌐 URL バリデータ" [level=3]
  - paragraph: Web サイトの URL を検証し、アクセス可能性をチェックします。
  - heading "📊 ダッシュボード" [level=3]
  - paragraph: テスト実行結果とカバレッジ情報をリアルタイムで監視できます。
  - heading "⚙️ 設定" [level=3]
  - paragraph: アプリケーション設定をカスタマイズして、最適な運用をサポートします。
- contentinfo:
  - paragraph: © 2026 Copilot Quality Harness. All rights reserved.
```

# Test source

```ts
  238 |       await expect(page.getByText('Second Check')).toBeVisible();
  239 |       
  240 |       const checks = page.locator('li');
  241 |       const firstCheck = await checks.first().textContent();
  242 |       
  243 |       expect(firstCheck).toContain('Second Check');
  244 |     });
  245 | 
  246 |     test('status is displayed for each check', async ({ page }) => {
  247 |       const input = page.getByLabel('Check name');
  248 |       const button = page.getByRole('button', { name: 'Add check' });
  249 |       
  250 |       await input.fill('Status Check');
  251 |       await button.click();
  252 |       
  253 |       // Check should have status badge
  254 |       const checkItem = page.locator('li', { has: page.getByText('Status Check') });
  255 |       const statusElement = checkItem.locator('small');
  256 |       
  257 |       await expect(statusElement).toBeVisible();
  258 |       const status = await statusElement.textContent();
  259 |       expect(['pending', 'passed', 'failed']).toContain(status);
  260 |     });
  261 |   });
  262 | 
  263 |   test.describe('Accessibility Tests', () => {
  264 |     test('form has proper labels for all inputs', async ({ page }) => {
  265 |       const label = page.getByRole('heading', { name: 'Quality checks' });
  266 |       await expect(label).toBeVisible();
  267 |       
  268 |       const input = page.getByLabel('Check name');
  269 |       await expect(input).toBeVisible();
  270 |     });
  271 | 
  272 |     test('button is keyboard accessible', async ({ page }) => {
  273 |       const input = page.getByLabel('Check name');
  274 |       const button = page.getByRole('button', { name: 'Add check' });
  275 |       
  276 |       await input.focus();
  277 |       await input.fill('Keyboard Test');
  278 |       
  279 |       await page.keyboard.press('Tab');
  280 |       await page.keyboard.press('Enter');
  281 |       
  282 |       await expect(page.getByText('Keyboard Test')).toBeVisible();
  283 |     });
  284 | 
  285 |     test('form is navigable with Tab key', async ({ page }) => {
  286 |       const input = page.getByLabel('Check name');
  287 |       
  288 |       await input.focus();
  289 |       const initialId = await input.evaluate(el => el.id);
  290 |       expect(initialId).toBe('check-name');
  291 |       
  292 |       await page.keyboard.press('Tab');
  293 |       const focusedId = await page.evaluate(() => document.activeElement?.id);
  294 |       expect(focusedId).not.toBe('check-name');
  295 |     });
  296 | 
  297 |     test('error message is announced as alert', async ({ page }) => {
  298 |       const input = page.getByLabel('Check name');
  299 |       const button = page.getByRole('button', { name: 'Add check' });
  300 |       
  301 |       await input.fill('   ');
  302 |       await button.click();
  303 |       
  304 |       const alert = page.getByRole('alert');
  305 |       await expect(alert).toBeVisible();
  306 |       
  307 |       // Alert should have accessible role
  308 |       const role = await alert.getAttribute('role');
  309 |       expect(role).toBe('alert');
  310 |     });
  311 | 
  312 |     test('section has proper heading', async ({ page }) => {
  313 |       const heading = page.getByRole('heading', { name: 'Quality checks' });
  314 |       await expect(heading).toBeVisible();
  315 |     });
  316 | 
  317 |     test('checks list has accessible heading', async ({ page }) => {
  318 |       const input = page.getByLabel('Check name');
  319 |       const button = page.getByRole('button', { name: 'Add check' });
  320 |       
  321 |       await input.fill('Test Check');
  322 |       await button.click();
  323 |       
  324 |       const listHeading = page.getByRole('heading', { name: 'Current checks' });
  325 |       await expect(listHeading).toBeVisible();
  326 |     });
  327 |   });
  328 | 
  329 |   test.describe('UI State Tests', () => {
  330 |     test('displays "No checks recorded yet" when empty', async ({ page }) => {
  331 |       await expect(page.getByText('No checks recorded yet.')).toBeVisible();
  332 |     });
  333 | 
  334 |     test('removes "No checks" message when first check is added', async ({ page }) => {
  335 |       const input = page.getByLabel('Check name');
  336 |       const button = page.getByRole('button', { name: 'Add check' });
  337 |       
> 338 |       await expect(page.getByText('No checks recorded yet.')).toBeVisible();
      |                                                               ^ Error: expect(locator).toBeVisible() failed
  339 |       
  340 |       await input.fill('First Check');
  341 |       await button.click();
  342 |       
  343 |       await expect(page.getByText('No checks recorded yet.')).not.toBeVisible();
  344 |     });
  345 | 
  346 |     test('displays checks as list items', async ({ page }) => {
  347 |       const input = page.getByLabel('Check name');
  348 |       const button = page.getByRole('button', { name: 'Add check' });
  349 |       
  350 |       await input.fill('List Check');
  351 |       await button.click();
  352 |       
  353 |       const listItems = page.locator('li');
  354 |       await expect(listItems.first()).toContainText('List Check');
  355 |     });
  356 |   });
  357 | 
  358 |   test.describe('Performance Tests', () => {
  359 |     test('page loads within reasonable time', async ({ page }) => {
  360 |       const startTime = Date.now();
  361 |       await page.goto('/');
  362 |       const loadTime = Date.now() - startTime;
  363 |       
  364 |       // Page should load within 5 seconds
  365 |       expect(loadTime).toBeLessThan(5000);
  366 |     });
  367 | 
  368 |     test('API call completes reasonably fast', async ({ page }) => {
  369 |       const input = page.getByLabel('Check name');
  370 |       const button = page.getByRole('button', { name: 'Add check' });
  371 |       
  372 |       await input.fill('Performance Test');
  373 |       
  374 |       const startTime = Date.now();
  375 |       await button.click();
  376 |       const duration = Date.now() - startTime;
  377 |       
  378 |       // API call should complete within 2 seconds
  379 |       expect(duration).toBeLessThan(2000);
  380 |       
  381 |       await expect(page.getByText('Performance Test')).toBeVisible();
  382 |     });
  383 |   });
  384 | });
  385 | 
```