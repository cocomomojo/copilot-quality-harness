#!/usr/bin/env node

/**
 * Playwright トレース解析スクリプト
 * 
 * 目的: Playwright trace.zip をパースし、失敗原因を抽出・分類する
 * 出力: trace-summary.json（必須キー付き）
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

interface TraceSummary {
  failure_reason: string;
  failing_test: string;
  failing_locator: string;
  top_console_errors: string[];
  top_network_failures: string[];
  screenshot_paths: string[];
  trace_excerpt: string;
  failure_category: 'network_error' | 'timeout' | 'element_not_found' | 'assertion_failure' | 'unknown';
  timestamp: string;
}

// シークレット・PII フィルタパターン
const SECRET_PATTERNS = [
  /\b[A-Za-z0-9_-]{40}\b/g, // API キー（40文字）
  /bearer\s+[A-Za-z0-9._\-]+/gi, // Bearer トークン
  /token[=":\s]+[A-Za-z0-9._\-]+/gi, // トークン
  /api[_-]?key[=":\s]+[A-Za-z0-9._\-]+/gi, // API キー
  /password[=":\s]+[^\s]+/gi, // パスワード
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // メールアドレス
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, // IP アドレス
  /\b\d{10,}\b/g, // 電話番号（10桁以上の数字）
];

function filterSecrets(text: string): string {
  let filtered = text;
  SECRET_PATTERNS.forEach(pattern => {
    filtered = filtered.replace(pattern, '[REDACTED]');
  });
  return filtered;
}

function classifyFailure(traceText: string, errorMessages: string[]): TraceSummary['failure_category'] {
  const combined = (traceText + ' ' + errorMessages.join(' ')).toLowerCase();

  if (combined.includes('timeout') || combined.includes('waitfor') || combined.includes('exceeded')) {
    return 'timeout';
  }
  if (combined.includes('network') || combined.includes('failed to fetch') || combined.includes('connection')) {
    return 'network_error';
  }
  if (combined.includes('element') || combined.includes('locator') || combined.includes('not found') || combined.includes('not visible')) {
    return 'element_not_found';
  }
  if (combined.includes('assert') || combined.includes('expected') || combined.includes('received')) {
    return 'assertion_failure';
  }

  return 'unknown';
}

async function analyzeTrace(tracePath: string): Promise<TraceSummary> {
  try {
    // trace ファイルが存在するか確認
    if (!fs.existsSync(tracePath)) {
      throw new Error(`Trace file not found: ${tracePath}`);
    }

    // trace.json をパース（trace.zip の場合は展開が必要）
    let traceData: any = {};
    let traceText = '';

    if (tracePath.endsWith('.zip')) {
      // zip ファイルの場合は、trace.json を抽出する必要がある
      // 簡略版：raw trace データとして扱う
      const fileContent = fs.readFileSync(tracePath, 'utf-8');
      traceText = fileContent;
    } else {
      // JSON ファイルの場合
      const fileContent = fs.readFileSync(tracePath, 'utf-8');
      traceData = JSON.parse(fileContent);
      traceText = JSON.stringify(traceData, null, 2);
    }

    // シークレット・PII を除外
    const filteredText = filterSecrets(traceText);

    // trace_excerpt を最大2000文字に要約
    const traceExcerpt = filteredText.substring(0, 2000);

    // エラーメッセージを抽出（簡略版）
    const consoleErrors: string[] = [];
    const networkFailures: string[] = [];

    // ログから error を抽出（パターンマッチング）
    const errorMatches = traceText.match(/error[:\s]+"?([^"\n]+)"?/gi) || [];
    consoleErrors.push(...errorMatches.slice(0, 3).map(m => filterSecrets(m)));

    // ネットワークエラーを抽出
    const networkMatches = traceText.match(/network[:\s]+"?([^"\n]+)"?/gi) || [];
    networkFailures.push(...networkMatches.slice(0, 3).map(m => filterSecrets(m)));

    // 失敗テスト名を抽出（簡略版）
    const testMatch = traceText.match(/"name":\s*"([^"]+)"/i);
    const failingTest = testMatch ? testMatch[1] : 'Unknown test';

    // locator を抽出（簡略版）
    const locatorMatch = traceText.match(/"locator":\s*"([^"]+)"/i);
    const failingLocator = locatorMatch ? locatorMatch[1] : 'Unknown locator';

    // スクリーンショットパスを抽出
    const screenshotMatches = traceText.match(/screenshot[s]?[:\s]+"([^"]+)"/gi) || [];
    const screenshotPaths = screenshotMatches.map(m => filterSecrets(m)).slice(0, 3);

    // 失敗原因を分類
    const failureCategory = classifyFailure(traceText, consoleErrors);

    // 失敗理由を生成
    const failureReason = `Test "${failingTest}" failed with ${failureCategory}: ${consoleErrors[0] || 'See details above'}`;

    return {
      failure_reason: failureReason,
      failing_test: failingTest,
      failing_locator: failingLocator,
      top_console_errors: consoleErrors.slice(0, 3),
      top_network_failures: networkFailures.slice(0, 3),
      screenshot_paths: screenshotPaths,
      trace_excerpt: traceExcerpt,
      failure_category: failureCategory,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error analyzing trace:', error);
    return {
      failure_reason: `Failed to analyze trace: ${error instanceof Error ? error.message : 'Unknown error'}`,
      failing_test: 'Unknown',
      failing_locator: 'Unknown',
      top_console_errors: [],
      top_network_failures: [],
      screenshot_paths: [],
      trace_excerpt: '',
      failure_category: 'unknown',
      timestamp: new Date().toISOString(),
    };
  }
}

async function main() {
  const traceArg = process.argv[2];

  if (!traceArg) {
    console.error('Usage: npx ts-node scripts/trace-summary.ts <trace-file-path>');
    process.exit(1);
  }

  const tracePath = path.resolve(traceArg);
  const summary = await analyzeTrace(tracePath);

  // 出力先を決定
  const outputDir = path.dirname(tracePath);
  const outputPath = path.join(outputDir, 'trace-summary.json');

  // JSON を出力
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
  console.log(`✅ Trace summary saved: ${outputPath}`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
