#!/usr/bin/env node

/**
 * E2E Test Result Report Generator
 * 
 * 目的: Playwright テスト結果とレポートから、
 * テストケース詳細情報を抽出し JSON に集計する
 * 
 * 入力:
 *   - test-results-node*-e2e.json (テスト結果サマリー)
 *   - playwright-report/index.json (Playwright HTML report metadata)
 *   - test-results/videos/* (動画ファイル)
 * 
 * 出力:
 *   - qa/e2e-report/test-cases.json (構造化テスト結果)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface TestResult {
  name: string;
  title: string;
  status: 'passed' | 'failed' | 'skipped' | 'interrupted';
  duration: number;
  file: string;
  errors?: string[];
  screenshots?: string[];
  videos?: string[];
}

interface TestSuite {
  name: string;
  file: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  tests: TestResult[];
}

interface E2EReport {
  timestamp: string;
  totalSuites: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  duration: number;
  suites: TestSuite[];
}

function findTestResultFiles(): string[] {
  const artifactsDir = './artifacts';
  const testResultsDir = './test-results';
  const playwrightReportDir = './playwright-report';
  
  const files: string[] = [];
  
  // test-results-node*-e2e.json を探す
  if (fs.existsSync(artifactsDir)) {
    try {
      const entries = fs.readdirSync(artifactsDir);
      for (const entry of entries) {
        const entryPath = path.join(artifactsDir, entry);
        const stat = fs.statSync(entryPath);
        
        if (stat.isDirectory()) {
          // test-results-node20-e2e/test-result-node20-e2e.json
          const jsonPath = path.join(entryPath, entry + '.json');
          if (fs.existsSync(jsonPath)) {
            files.push(jsonPath);
          }
        }
      }
    } catch (e) {
      console.warn('⚠️  Could not scan artifacts directory:', (e as Error).message);
    }
  }
  
  // Playwright report をスキャン
  if (fs.existsSync(playwrightReportDir)) {
    const indexPath = path.join(playwrightReportDir, 'index.json');
    if (fs.existsSync(indexPath)) {
      files.push(indexPath);
    }
  }
  
  // test-results/summary.json をスキャン
  if (fs.existsSync(testResultsDir)) {
    const summaryPath = path.join(testResultsDir, 'summary.json');
    if (fs.existsSync(summaryPath)) {
      files.push(summaryPath);
    }
  }
  
  return files;
}

function parseTestResults(filePath: string): TestSuite[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    const suites: TestSuite[] = [];
    
    // Playwright report format
    if (data.suites && Array.isArray(data.suites)) {
      for (const suite of data.suites) {
        const tests: TestResult[] = [];
        
        if (suite.tests && Array.isArray(suite.tests)) {
          for (const test of suite.tests) {
            const testResult: TestResult = {
              name: test.title || 'unknown',
              title: test.title || 'unknown',
              status: test.status || 'skipped',
              duration: test.duration || 0,
              file: suite.file || 'unknown',
              errors: test.errors ? test.errors.map((e: any) => e.message || String(e)) : [],
              screenshots: test.attachments
                ? test.attachments
                    .filter((a: any) => a.type === 'image/png')
                    .map((a: any) => a.path)
                : [],
              videos: test.attachments
                ? test.attachments
                    .filter((a: any) => a.type === 'video/webm' || a.contentType?.includes('video'))
                    .map((a: any) => a.path)
                : []
            };
            tests.push(testResult);
          }
        }
        
        const passed = tests.filter(t => t.status === 'passed').length;
        const failed = tests.filter(t => t.status === 'failed').length;
        const skipped = tests.filter(t => t.status === 'skipped').length;
        
        suites.push({
          name: suite.title || path.basename(suite.file || 'unknown'),
          file: suite.file || 'unknown',
          totalTests: tests.length,
          passed,
          failed,
          skipped,
          duration: suite.duration || tests.reduce((sum, t) => sum + t.duration, 0),
          tests
        });
      }
    }
    // test-results-node*-e2e.json format
    else if (data.test_suites && Array.isArray(data.test_suites)) {
      for (const suite of data.test_suites) {
        suites.push({
          name: suite.name || 'unknown',
          file: suite.name || 'unknown',
          totalTests: suite.passed + suite.failed,
          passed: suite.passed,
          failed: 0,
          skipped: 0,
          duration: suite.duration_ms || 0,
          tests: []
        });
      }
    }
    
    return suites;
  } catch (e) {
    console.warn(`⚠️  Could not parse ${filePath}:`, (e as Error).message);
    return [];
  }
}

function findVideoFiles(): Map<string, string> {
  const videoMap = new Map<string, string>();
  const videoDir = './test-results/videos';
  
  if (fs.existsSync(videoDir)) {
    try {
      const entries = fs.readdirSync(videoDir);
      for (const entry of entries) {
        if (entry.endsWith('.webm') || entry.endsWith('.mp4')) {
          // video file name patterns:
          // {test-name}-{timestamp}.webm
          // {test-id}.webm
          const testKey = entry.replace(/\.(webm|mp4)$/, '').split('-')[0];
          videoMap.set(testKey, path.join(videoDir, entry));
        }
      }
    } catch (e) {
      console.warn('⚠️  Could not scan video directory:', (e as Error).message);
    }
  }
  
  return videoMap;
}

function generateReport(): E2EReport {
  console.log('📊 Generating E2E Test Report...\n');
  
  const resultFiles = findTestResultFiles();
  console.log(`Found ${resultFiles.length} test result files`);
  
  if (resultFiles.length === 0) {
    console.warn('⚠️  No test result files found. Using empty report.');
  }
  
  const videoMap = findVideoFiles();
  console.log(`Found ${videoMap.size} video files\n`);
  
  let allSuites: TestSuite[] = [];
  
  for (const file of resultFiles) {
    const suites = parseTestResults(file);
    allSuites = allSuites.concat(suites);
    console.log(`  ✓ Parsed ${suites.length} suites from ${path.basename(file)}`);
  }
  
  // Aggregate results
  const totalTests = allSuites.reduce((sum, s) => sum + s.totalTests, 0);
  const passed = allSuites.reduce((sum, s) => sum + s.passed, 0);
  const failed = allSuites.reduce((sum, s) => sum + s.failed, 0);
  const skipped = allSuites.reduce((sum, s) => sum + s.skipped, 0);
  const duration = allSuites.reduce((sum, s) => sum + s.duration, 0);
  const passRate = totalTests > 0 ? Math.round((passed / totalTests) * 100) : 100;
  
  // Attach video files to test results
  for (const suite of allSuites) {
    for (const test of suite.tests) {
      const videoKey = test.name.replace(/\s+/g, '-').toLowerCase();
      if (videoMap.has(videoKey)) {
        test.videos = [videoMap.get(videoKey)!];
      }
    }
  }
  
  const report: E2EReport = {
    timestamp: new Date().toISOString(),
    totalSuites: allSuites.length,
    totalTests,
    passed,
    failed,
    skipped,
    passRate,
    duration,
    suites: allSuites
  };
  
  console.log(`\n✅ Report Summary:`);
  console.log(`  - Total Tests: ${totalTests}`);
  console.log(`  - Passed: ${passed}`);
  console.log(`  - Failed: ${failed}`);
  console.log(`  - Skipped: ${skipped}`);
  console.log(`  - Pass Rate: ${passRate}%`);
  console.log(`  - Duration: ${(duration / 1000).toFixed(1)}s`);
  
  return report;
}

// Main
const outputDir = process.argv[2] || 'qa/e2e-report';
const report = generateReport();

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write report
const outputPath = path.join(outputDir, 'test-cases.json');
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(`\n✅ Report saved to: ${outputPath}`);

// Export for use in other scripts
export { E2EReport, TestSuite, TestResult };
