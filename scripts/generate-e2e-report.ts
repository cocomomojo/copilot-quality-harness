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
  
  console.log('🔍 Searching for test result files in multiple locations...');
  
  // artifacts ディレクトリをスキャン
  if (fs.existsSync(artifactsDir)) {
    try {
      const entries = fs.readdirSync(artifactsDir);
      console.log(`  📁 ./artifacts/ (${entries.length} items)`);
      for (const entry of entries) {
        const entryPath = path.join(artifactsDir, entry);
        const stat = fs.statSync(entryPath);
        
        if (stat.isDirectory()) {
          console.log(`    📂 ${entry}/`);
          // ディレクトリ内のすべての .json ファイルを探す
          const dirFiles = fs.readdirSync(entryPath);
          for (const dirFile of dirFiles) {
            if (dirFile.endsWith('.json')) {
              const jsonPath = path.join(entryPath, dirFile);
              console.log(`      ✓ ${dirFile}`);
              files.push(jsonPath);
            }
          }
        } else if (entry.endsWith('.json')) {
          // ディレクトリではなく、直接 JSON ファイルの場合
          console.log(`    ✓ ${entry}`);
          files.push(entryPath);
        }
      }
    } catch (e) {
      console.warn('⚠️  Could not scan artifacts directory:', (e as Error).message);
    }
  } else {
    console.log('  📁 ./artifacts/ (not found)');
  }
  
  // Playwright report をスキャン
  if (fs.existsSync(playwrightReportDir)) {
    const indexPath = path.join(playwrightReportDir, 'index.json');
    if (fs.existsSync(indexPath)) {
      console.log(`  ✓ playwright-report/index.json`);
      files.push(indexPath);
    }
  }
  
  // test-results ディレクトリをスキャン
  if (fs.existsSync(testResultsDir)) {
    try {
      const entries = fs.readdirSync(testResultsDir);
      for (const entry of entries) {
        if (entry.endsWith('.json')) {
          const jsonPath = path.join(testResultsDir, entry);
          console.log(`  ✓ test-results/${entry}`);
          files.push(jsonPath);
        }
      }
    } catch (e) {
      console.warn('⚠️  Could not scan test-results directory:', (e as Error).message);
    }
  }
  
  return files;
}

function parseTestResults(filePath: string): TestSuite[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    const suites: TestSuite[] = [];
    
    // Playwright summary.json format (nested suites structure)
    if (data.suites && Array.isArray(data.suites)) {
      for (const topLevel of data.suites) {
        // Process nested suites structure
        const processNestedSuites = (suiteLevelOrSpecs: any, fileName: string): TestSuite | null => {
          // Check if this level has specs (actual tests)
          if (suiteLevelOrSpecs.specs && Array.isArray(suiteLevelOrSpecs.specs)) {
            const tests: TestResult[] = [];
            
            for (const spec of suiteLevelOrSpecs.specs) {
              if (spec.tests && Array.isArray(spec.tests)) {
                for (const test of spec.tests) {
                  const testStatus = test.results && test.results[0] 
                    ? (test.results[0].status || 'skipped')
                    : 'skipped';
                  
                  const testResult: TestResult = {
                    name: spec.title || 'unknown',
                    title: spec.title || 'unknown',
                    status: testStatus as 'passed' | 'failed' | 'skipped' | 'interrupted',
                    duration: test.results && test.results[0] ? (test.results[0].duration || 0) : 0,
                    file: fileName,
                    errors: test.results && test.results[0] && test.results[0].error
                      ? [test.results[0].error.message || String(test.results[0].error)]
                      : [],
                    screenshots: test.results && test.results[0] && test.results[0].attachments
                      ? test.results[0].attachments
                          .filter((a: any) => a.contentType?.includes('image'))
                          .map((a: any) => normalizeReportAssetPath(a.path) || a.path)
                          .filter(Boolean)
                      : [],
                    videos: test.results && test.results[0] && test.results[0].attachments
                      ? test.results[0].attachments
                          .filter((a: any) => a.contentType?.includes('video'))
                          .map((a: any) => normalizeReportAssetPath(a.path) || a.path)
                          .filter(Boolean)
                      : []
                  };
                  tests.push(testResult);
                }
              }
            }
            
            if (tests.length > 0) {
              const passed = tests.filter(t => t.status === 'passed').length;
              const failed = tests.filter(t => t.status === 'failed').length;
              const skipped = tests.filter(t => t.status === 'skipped').length;
              
              return {
                name: suiteLevelOrSpecs.title || fileName,
                file: fileName,
                totalTests: tests.length,
                passed,
                failed,
                skipped,
                duration: tests.reduce((sum, t) => sum + t.duration, 0),
                tests
              };
            }
          }
          
          // If not at specs level, check for nested suites
          if (suiteLevelOrSpecs.suites && Array.isArray(suiteLevelOrSpecs.suites)) {
            for (const nested of suiteLevelOrSpecs.suites) {
              const nestedResult = processNestedSuites(nested, fileName);
              if (nestedResult) {
                return nestedResult;
              }
            }
          }
          
          return null;
        };
        
        // Process top-level suite or its children
        if (topLevel.title && topLevel.title.includes('.js')) {
          // This is a file-level suite, process its children
          const fileName = topLevel.title;
          
          if (topLevel.suites && Array.isArray(topLevel.suites)) {
            for (const nestedSuite of topLevel.suites) {
              const processedSuite = processNestedSuites(nestedSuite, fileName);
              if (processedSuite) {
                suites.push(processedSuite);
              }
            }
          }
        } else {
          const processedSuite = processNestedSuites(topLevel, topLevel.file || 'unknown');
          if (processedSuite) {
            suites.push(processedSuite);
          }
        }
      }
      
      console.log(`  📊 Processed ${suites.length} suites from Playwright summary.json format`);
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

function normalizeReportAssetPath(filePath: string | null | undefined): string | null {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, '/');
  const basename = normalized.split('/').pop();
  if (!basename || !/\.(webm|mp4|png|jpg|jpeg)$/i.test(basename)) return null;

  if (normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('./') || normalized.startsWith('../')) {
    return normalized;
  }

  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized) || normalized.includes('/home/') || normalized.includes('/tmp/')) {
    return `./${basename}`;
  }

  return normalized;
}

function findVideoFiles(): Map<string, string> {
  const videoMap = new Map<string, string>();
  const videoDirs = [
    './test-results/videos',
    './artifacts/e2e-test-results-node-20/videos',  // CI でダウンロードされた位置
    './artifacts/e2e-videos-node-20'
  ];
  
  console.log('🎬 Searching for video files...');
  
  for (const videoDir of videoDirs) {
    if (fs.existsSync(videoDir)) {
      console.log(`  📁 ${videoDir}`);
      try {
        const entries = fs.readdirSync(videoDir);
        for (const entry of entries) {
          if (entry.endsWith('.webm') || entry.endsWith('.mp4')) {
            console.log(`    ✓ ${entry}`);
            const testKey = entry.replace(/\.(webm|mp4)$/, '').split('-')[0];
            const assetPath = normalizeReportAssetPath(path.join(videoDir, entry));
            if (assetPath) videoMap.set(testKey, assetPath);
          }
        }
      } catch (e) {
        console.warn(`    ⚠️  Could not scan: ${(e as Error).message}`);
      }
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
      const mappedVideo = videoMap.get(videoKey);
      if (mappedVideo) {
        test.videos = [mappedVideo];
      } else if (test.videos && test.videos.length > 0) {
        test.videos = test.videos
          .map((video) => normalizeReportAssetPath(video) || video)
          .filter(Boolean);
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
