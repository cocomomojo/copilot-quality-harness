# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: quality-checks-advanced.spec.js >> Quality Checks UI - Error Scenarios & Edge Cases >> Input Validation Tests >> accepts check name with special characters
- Location: e2e/quality-checks-advanced.spec.js:88:9

# Error details

```
TimeoutError: locator.fill: Timeout 10000ms exceeded.
Call log:
  - waiting for getByLabel('Check name')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite:import-analysis] Failed to resolve import \"./App.jsx\" from \"src/main.jsx\". Does the file exist?"
  - generic [ref=e5]: /home/runner/work/copilot-quality-harness/copilot-quality-harness/frontend/src/main.jsx:3:16
  - generic [ref=e6]: "2 | import React from \"react\"; 3 | import { createRoot } from \"react-dom/client\"; 4 | import App from \"./App.jsx\"; | ^ 5 | import \"./styles.css\"; 6 | createRoot(document.getElementById(\"root\")).render("
  - generic [ref=e7]: at TransformPluginContext._formatLog (file:///home/runner/work/copilot-quality-harness/copilot-quality-harness/node_modules/vite/dist/node/chunks/dep-3O3b9SCF.js:42846:41) at TransformPluginContext.error (file:///home/runner/work/copilot-quality-harness/copilot-quality-harness/node_modules/vite/dist/node/chunks/dep-3O3b9SCF.js:42843:16) at normalizeUrl (file:///home/runner/work/copilot-quality-harness/copilot-quality-harness/node_modules/vite/dist/node/chunks/dep-3O3b9SCF.js:40820:23) at process.processTicksAndRejections (node:internal/process/task_queues:95:5) at async file:///home/runner/work/copilot-quality-harness/copilot-quality-harness/node_modules/vite/dist/node/chunks/dep-3O3b9SCF.js:40939:37 at async Promise.all (index 3) at async TransformPluginContext.transform (file:///home/runner/work/copilot-quality-harness/copilot-quality-harness/node_modules/vite/dist/node/chunks/dep-3O3b9SCF.js:40866:7) at async EnvironmentPluginContainer.transform (file:///home/runner/work/copilot-quality-harness/copilot-quality-harness/node_modules/vite/dist/node/chunks/dep-3O3b9SCF.js:42641:18) at async loadAndTransform (file:///home/runner/work/copilot-quality-harness/copilot-quality-harness/node_modules/vite/dist/node/chunks/dep-3O3b9SCF.js:36053:27) at async viteTransformMiddleware (file:///home/runner/work/copilot-quality-harness/copilot-quality-harness/node_modules/vite/dist/node/chunks/dep-3O3b9SCF.js:37550:24
  - generic [ref=e8]:
    - text: Click outside, press Esc key, or fix the code to dismiss.You can also disable this overlay by setting
    - code [ref=e9]: server.hmr.overlay
    - text: to
    - code [ref=e10]: "false"
    - text: in
    - code [ref=e11]: vite.config.js
    - text: .
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | 
  3   | const ERROR_MESSAGE_INVALID_NAME = 'name must be between 1 and 120 characters';
  4   | 
  5   | test.describe('Quality Checks UI - Error Scenarios & Edge Cases', () => {
  6   |   test.beforeEach(async ({ page, request }) => {
  7   |     // Reset checks before each test to avoid accumulation
  8   |     await request.post('http://localhost:3000/api/test/reset-checks').catch(() => {
  9   |       // Endpoint might not be available, continue
  10  |     });
  11  |     
  12  |     await page.goto('/');
  13  |     await page.waitForLoadState('networkidle');
  14  |   });
  15  | 
  16  |   test.describe('Error Path Tests', () => {
  17  |     test('displays error when adding check with only whitespace', async ({ page }) => {
  18  |       const input = page.getByLabel('Check name');
  19  |       const button = page.getByRole('button', { name: 'Add check' });
  20  |       
  21  |       await input.fill('   ');
  22  |       await button.click();
  23  |       
  24  |       const error = page.getByRole('alert');
  25  |       await expect(error).toBeVisible();
  26  |       await expect(error).toContainText(ERROR_MESSAGE_INVALID_NAME);
  27  |     });
  28  | 
  29  |     test('displays error when name exceeds 120 characters', async ({ page }) => {
  30  |       const input = page.getByLabel('Check name');
  31  | 
  32  |       // HTML input maxLength="120" will prevent exceeding 120 characters
  33  |       // Fill with 121 characters to test truncation behavior
  34  |       await input.fill('A'.repeat(121));
  35  | 
  36  |       // Verify that the actual input value is truncated to 120 characters
  37  |       await expect(input).toHaveValue('A'.repeat(120));
  38  |     });
  39  | 
  40  |     test('clears error message when user corrects input', async ({ page }) => {
  41  |       const input = page.getByLabel('Check name');
  42  |       const button = page.getByRole('button', { name: 'Add check' });
  43  | 
  44  |       await input.fill('   ');
  45  |       await button.click();
  46  | 
  47  |       const error = page.getByRole('alert');
  48  |       await expect(error).toBeVisible();
  49  |       await expect(error).toContainText(ERROR_MESSAGE_INVALID_NAME);
  50  | 
  51  |       await input.fill('Valid Check Name');
  52  |       // Error should be cleared before submission
  53  |       await button.click();
  54  | 
  55  |       await expect(page.getByText('Valid Check Name')).toBeVisible();
  56  |     });
  57  | 
  58  |     test('shows appropriate error when API is unavailable', async ({ page, context }) => {
  59  |       // Mock fetch to simulate API failure
  60  |       await context.addInitScript(() => {
  61  |         window.originalFetch = fetch;
  62  |         window.fetch = async (url, options) => {
  63  |           if (url.includes('/api/checks')) {
  64  |             throw new Error('Network error');
  65  |           }
  66  |           return window.originalFetch(url, options);
  67  |         };
  68  |       });
  69  |       
  70  |       await page.reload();
  71  |       
  72  |       const error = page.getByRole('alert');
  73  |       await expect(error).toBeVisible();
  74  |     });
  75  |   });
  76  | 
  77  |   test.describe('Input Validation Tests', () => {
  78  |     test('accepts check name with unicode characters', async ({ page }) => {
  79  |       const input = page.getByLabel('Check name');
  80  |       const button = page.getByRole('button', { name: 'Add check' });
  81  |       
  82  |       await input.fill('日本語テスト');
  83  |       await button.click();
  84  |       
  85  |       await expect(page.getByText('日本語テスト')).toBeVisible();
  86  |     });
  87  | 
  88  |     test('accepts check name with special characters', async ({ page }) => {
  89  |       const input = page.getByLabel('Check name');
  90  |       const button = page.getByRole('button', { name: 'Add check' });
  91  |       
  92  |       const specialName = 'Check #123 - Special & Test!';
> 93  |       await input.fill(specialName);
      |                   ^ TimeoutError: locator.fill: Timeout 10000ms exceeded.
  94  |       await button.click();
  95  |       
  96  |       await expect(page.getByText(specialName)).toBeVisible();
  97  |     });
  98  | 
  99  |     test('accepts check name with quotes', async ({ page }) => {
  100 |       const input = page.getByLabel('Check name');
  101 |       const button = page.getByRole('button', { name: 'Add check' });
  102 |       
  103 |       const nameWithQuotes = 'Check with "quotes"';
  104 |       await input.fill(nameWithQuotes);
  105 |       await button.click();
  106 |       
  107 |       await expect(page.getByText(nameWithQuotes)).toBeVisible();
  108 |     });
  109 | 
  110 |     test('accepts single character check name', async ({ page }) => {
  111 |       const input = page.getByLabel('Check name');
  112 |       const button = page.getByRole('button', { name: 'Add check' });
  113 |       
  114 |       await input.fill('A');
  115 |       await button.click();
  116 |       
  117 |       // セレクタを詳細化: リスト内の 'A' のみを対象
  118 |       const checksList = page.locator('ul');
  119 |       await expect(checksList.getByText('A', { exact: true })).toBeVisible();
  120 |     });
  121 | 
  122 |     test('trims whitespace from check name', async ({ page }) => {
  123 |       const input = page.getByLabel('Check name');
  124 |       const button = page.getByRole('button', { name: 'Add check' });
  125 |       
  126 |       await input.fill('  trimmed name  ');
  127 |       await button.click();
  128 |       
  129 |       // Should show trimmed version
  130 |       await expect(page.getByText('trimmed name')).toBeVisible();
  131 |     });
  132 |   });
  133 | 
  134 |   test.describe('User Interaction Tests', () => {
  135 |     test('form clears after successful submission', async ({ page }) => {
  136 |       const input = page.getByLabel('Check name');
  137 |       const button = page.getByRole('button', { name: 'Add check' });
  138 |       
  139 |       await input.fill('Test Check');
  140 |       await button.click();
  141 |       
  142 |       await expect(page.getByText('Test Check')).toBeVisible();
  143 |       
  144 |       const inputValue = await input.inputValue();
  145 |       expect(inputValue).toBe('');
  146 |     });
  147 | 
  148 |     test('focuses input after successful submission', async ({ page }) => {
  149 |       const input = page.getByLabel('Check name');
  150 |       const button = page.getByRole('button', { name: 'Add check' });
  151 |       
  152 |       await input.fill('Test Check');
  153 |       await button.click();
  154 |       
  155 |       // セレクタを詳細化: リスト内の 'Test Check' のみ
  156 |       const checksList = page.locator('ul');
  157 |       await expect(checksList.getByText('Test Check')).toBeVisible();
  158 |       
  159 |       // Input should still have focus for next entry
  160 |       const focusedElement = await page.evaluate(() => document.activeElement?.id);
  161 |       expect(focusedElement).toBe('check-name');
  162 |     });
  163 | 
  164 |     test('can add multiple checks in sequence', async ({ page }) => {
  165 |       const input = page.getByLabel('Check name');
  166 |       const button = page.getByRole('button', { name: 'Add check' });
  167 |       
  168 |       const checkNames = ['First Check', 'Second Check', 'Third Check'];
  169 |       
  170 |       for (const name of checkNames) {
  171 |         await input.fill(name);
  172 |         await button.click();
  173 |         await expect(page.getByText(name)).toBeVisible();
  174 |       }
  175 |       
  176 |       // Verify all are displayed
  177 |       for (const name of checkNames) {
  178 |         await expect(page.getByText(name)).toBeVisible();
  179 |       }
  180 |     });
  181 | 
  182 |     test('prevents duplicate submission during API call', async ({ page }) => {
  183 |       const button = page.getByRole('button', { name: 'Add check' });
  184 |       const input = page.getByLabel('Check name');
  185 |       
  186 |       await input.fill('Test Check');
  187 |       
  188 |       // Click button multiple times rapidly
  189 |       await button.click();
  190 |       await button.click();
  191 |       
  192 |       // Should only create one check
  193 |       const checks = await page.locator('text=Test Check').count();
```