import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,  // テストタイムアウト: 30秒
  expect: {
    timeout: 5000
  },
  webServer: [
    { 
      command: 'npm run start --workspace backend',
      url: 'http://127.0.0.1:3000/api/health',
      reuseExistingServer: true,
      timeout: 120000,  // サーバー起動タイムアウト: 120秒
      stdout: 'pipe',
      stderr: 'pipe',
      env: { NODE_ENV: 'test' }
    },
    { 
      command: 'npm run dev --workspace frontend',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: true,
      timeout: 120000,  // サーバー起動タイムアウト: 120秒
      stdout: 'pipe',
      stderr: 'pipe'
    }
  ],
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/summary.json' }]
  ],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    // 成功テストのステップ/操作ログ可視化のため常時 trace を収集
    // 必要に応じて PW_TRACE_MODE=retain-on-failure で切り替え可能
    trace: process.env.PW_TRACE_MODE || 'on',
    screenshot: 'only-on-failure',
    video: 'on',
    launchOptions: {
      slowMo: 1000
    },
    navigationTimeout: 30000,
    actionTimeout: 10000
  },
  workers: 1  // GitHub Actions では単一 worker で実行（並列実行による競合を回避）
});
