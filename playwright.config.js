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
      stderr: 'pipe'
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
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30000,
    actionTimeout: 10000
  },
  workers: 1  // GitHub Actions では単一 worker で実行（並列実行による競合を回避）
});
