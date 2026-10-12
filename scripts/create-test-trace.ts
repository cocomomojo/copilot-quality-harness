#!/usr/bin/env node

/**
 * テスト用 Playwright trace.zip を生成するスクリプト
 * 
 * 目的: Phase 2 テスト・検証用に、実際の Playwright trace.zip ファイルを生成
 * 用途: ワークフロー テスト、ローカル動作確認
 */

import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';

function createTestTraceZip() {
  const zip = new AdmZip();

  // trace.json をzipに追加
  const traceData = {
    version: 1,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    startTime: new Date().getTime(),
    pages: [
      {
        id: 'page-1',
        events: [
          {
            type: 'error',
            timestamp: new Date().getTime(),
            message: 'Timeout: waitForSelector exceeded 5000ms while waiting for button[data-testid="submit"]',
            level: 'error',
            category: 'timeout'
          }
        ]
      }
    ],
    testResult: {
      name: 'login_integration_test',
      status: 'failed',
      error: 'Timeout at page.waitForSelector()',
      duration: 5500,
      locator: 'button[data-testid="submit"]'
    }
  };

  zip.addFile('resources/trace.json', Buffer.from(JSON.stringify(traceData, null, 2), 'utf-8'));

  // スクリーンショットをダミーで追加
  const screenshotData = Buffer.alloc(100);
  screenshotData.fill(0);
  zip.addFile('screenshots/failed-screenshot-1.png', screenshotData);

  // playwright.log をテキストで追加
  const logContent = `[2026-10-12T02:35:00.000Z] ℹ Using config at ./playwright.config.ts
[2026-10-12T02:35:01.000Z] ℹ Launching chromium
[2026-10-12T02:35:02.000Z] → login_integration_test
[2026-10-12T02:35:03.000Z] ✓ passed [2ms]
[2026-10-12T02:35:04.000Z] Error: Timeout after 5000ms
[2026-10-12T02:35:05.000Z] Error: Element button[data-testid="submit"] not found or not visible
[2026-10-12T02:35:06.000Z] ✗ FAILED login_integration_test`;

  zip.addFile('logs/playwright.log', Buffer.from(logContent, 'utf-8'));

  return zip;
}

async function main() {
  try {
    const zip = createTestTraceZip();
    const outputPath = path.resolve('qa/sample-trace.zip');

    zip.writeZip(outputPath);

    console.log(`✅ Test trace.zip created: ${outputPath}`);
    console.log(`📦 File size: ${fs.statSync(outputPath).size} bytes`);
    console.log(`📝 Contents:`);
    console.log(`   - resources/trace.json (Playwright trace data)`);
    console.log(`   - screenshots/failed-screenshot-1.png (Sample image)`);
    console.log(`   - logs/playwright.log (Test log)`);
  } catch (error) {
    console.error('Error creating test trace.zip:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
