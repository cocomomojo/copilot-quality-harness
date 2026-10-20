#!/usr/bin/env node

/**
 * Advanced KPI Collection Script - Pattern 3
 * 
 * リアルタイム実テスト結果の自動収集
 * - test-matrix.yml からの実テスト結果を読み込み
 * - GitHub API からテスト実行詳細を取得
 * - 複合スコアで AI 危険度ランクを計算
 * - トレンド分析と 90 日履歴管理
 * 
 * Mock データは完全排除 - 実データのみ使用
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { mkdirSync } from 'node:fs';

const GITHUB_TOKEN = process.env.GH_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY || 'cocomomojo/copilot-quality-harness';
const OUTPUT_DIR = process.argv[2] || 'qa/dashboard-data';

mkdirSync(OUTPUT_DIR, { recursive: true });

/**
 * test-matrix からアーティファクト経由でテスト結果を取得
 */
async function fetchTestResults() {
  console.log('\n📊 Fetching actual test results from artifacts...');
  
  try {
    // 最新の test-matrix 実行を取得
    const cmd = `gh run list --workflow=test-matrix.yml --limit=1 --json databaseId,conclusion,status,createdAt -q '.[] | select(.conclusion != null)'`;
    
    const output = execSync(cmd, { 
      encoding: 'utf-8',
      env: { ...process.env, GH_TOKEN: GITHUB_TOKEN }
    });
    
    const run = JSON.parse(output.trim());
    
    if (!run) {
      console.log('⚠️  No completed test runs found');
      return null;
    }
    
    const runId = run.databaseId;
    console.log(`✓ Latest test-matrix run: ${runId}`);
    console.log(`  Status: ${run.conclusion}`);
    
    // test-matrix-summary を探してダウンロード
    console.log(`  Searching for test-matrix-summary artifact...`);
    
    try {
      // Artifact をローカルにダウンロード
      const downloadDir = '/tmp/test-results-$$';
      execSync(`gh run download ${runId} --name test-matrix-summary --dir ${downloadDir} 2>/dev/null || true`, {
        env: { ...process.env, GH_TOKEN: GITHUB_TOKEN }
      });
      
      const summaryPath = `${downloadDir}/test-matrix-summary.json`;
      if (existsSync(summaryPath)) {
        console.log(`  ✓ Found test-matrix-summary.json`);
        const summary = JSON.parse(readFileSync(summaryPath, 'utf-8'));
        return {
          runId,
          conclusion: run.conclusion,
          createdAt: run.createdAt,
          summary: summary,
          source: 'test-matrix-artifact'
        };
      }
    } catch (e) {
      // artifact がなければ continue
    }
    
    // Fallback: GitHub API で直接ジョブ情報を取得
    console.log(`  Fallback: Fetching job details from API...`);
    const jobsCmd = `gh run view ${runId} --json jobs -q '.jobs[]'`;
    const jobsOutput = execSync(jobsCmd, {
      encoding: 'utf-8',
      env: { ...process.env, GH_TOKEN: GITHUB_TOKEN }
    });
    
    let jobs = [];
    jobsOutput.trim().split('\n')
      .filter(line => line.trim())
      .forEach(line => {
        try {
          jobs.push(JSON.parse(line));
        } catch (e) {
          // skip
        }
      });
    
    return {
      runId,
      conclusion: run.conclusion,
      createdAt: run.createdAt,
      jobs: jobs,
      source: 'github-api'
    };
  } catch (error) {
    console.log('⚠️  Error fetching test results:', error.message);
    return null;
  }
}

/**
 * テスト結果を実データから解析
 */
function parseTestResults(testData) {
  console.log('\n🔍 Parsing actual test results...');
  
  if (!testData) {
    console.log('❌ No test data available');
    return null;
  }
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let passRate = 0;
  
  if (testData.source === 'test-matrix-artifact' && testData.summary) {
    // test-matrix-summary から実データを取得
    const summary = testData.summary;
    totalTests = summary.total_tests || 0;
    passedTests = summary.total_passed || 0;
    failedTests = summary.total_failed || 0;
    passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    
    console.log(`  ✓ Total tests: ${totalTests}`);
    console.log(`  ✓ Passed: ${passedTests}`);
    console.log(`  ✓ Failed: ${failedTests}`);
    console.log(`  ✓ Pass rate: ${passRate}%`);
    
    return {
      totalTests,
      passedTests,
      failedTests,
      passRate,
      source: 'test-matrix'
    };
  } else if (testData.source === 'github-api' && testData.jobs) {
    // GitHub API ジョブから推定
    const jobs = testData.jobs;
    const testJobs = jobs.filter(j => 
      j.name && (j.name.includes('test') || j.name.includes('Test'))
    );
    
    totalTests = testJobs.length;
    passedTests = testJobs.filter(j => j.conclusion === 'success').length;
    failedTests = testJobs.filter(j => j.conclusion === 'failure').length;
    passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    
    if (totalTests > 0) {
      console.log(`  ✓ Test jobs found: ${totalTests}`);
      console.log(`  ✓ Passed: ${passedTests}`);
      console.log(`  ✓ Failed: ${failedTests}`);
    } else {
      console.log(`  ⚠️  No test jobs found in workflow`);
      return null;
    }
    
    return {
      totalTests,
      passedTests,
      failedTests,
      passRate,
      source: 'github-api'
    };
  }
  
  return null;
}

  
  if (!testRun || !testRun.jobs) {
    console.log('⚠️  No test jobs found');
    return { totalTests, passedTests, failedTests, testCoverage, jobDetails };
  }
  
  // テストジョブから結果を抽出（複数のテストマトリックス対応）
  testRun.jobs.forEach(job => {
    // ジョブ名から test 関連かどうかを判定
    if (job.name && (job.name.includes('test') || job.name.includes('Test') || job.name.includes('coverage'))) {
      const status = job.conclusion === 'success' ? '✓' : '✗';
      console.log(`  ${status} ${job.name}: ${job.conclusion}`);
      
      jobDetails.push({
        name: job.name,
        conclusion: job.conclusion,
        durationMs: job.durationMs || 0
      });
      
      // 成功/失敗カウント（ジョブ = 1 テストスイート と見なす）
      if (job.conclusion === 'success') {
        passedTests++;
      } else if (job.conclusion === 'failure') {
        failedTests++;
      }
      
      totalTests++;
    }
  });
  
  // テストジョブがない場合はマトリックス数から推定
  if (totalTests === 0) {
    totalTests = testRun.jobs.length;
    passedTests = testRun.conclusion === 'success' ? testRun.jobs.length : 0;
    failedTests = testRun.conclusion !== 'success' ? testRun.jobs.length : 0;
  }
  
  const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  
  return {
    totalTests: totalTests || 0,
    passedTests: passedTests || 0,
    failedTests: failedTests || 0,
    passRate: passRate || 0,
    testCoverage: testCoverage || 0,
    jobDetails
  };
}

/**
 * ローカルファイルからカバレッジデータを読み込む
 */
function readCoverageData() {
  console.log('\n📈 Reading coverage data...');
  
  const possiblePaths = [
    'coverage/coverage-final.json',
    'qa/test-management/coverage.json',
    'coverage-summary.json'
  ];
  
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      try {
        const data = JSON.parse(readFileSync(path, 'utf-8'));
        
        // coverage-final.json 形式
        if (data.total && data.total.lines) {
          const coverage = Math.round(data.total.lines.pct);
          console.log(`  Coverage: ${coverage}%`);
          return coverage;
        }
        
        // カスタム形式
        if (data.coverage !== undefined) {
          console.log(`  Coverage: ${data.coverage}%`);
          return data.coverage;
        }
      } catch (e) {
        console.log(`  Warning: Could not parse ${path}`);
      }
    }
  }
  
  console.log('  ℹ️  Coverage data not found, using default');
  return 0;
}

/**
 * AI Danger Rank を計算
 * 複合指標に基づいた精密な危険度評価
 */
function calculateAIDangerRank(passRate, coverage, testCount, failedCount) {
  console.log('\n⚠️  Calculating AI Danger Rank...');
  
  const weights = {
    passRate: 0.4,      // テスト成功率 40%
    coverage: 0.3,      // コードカバレッジ 30%
    testVolume: 0.2,    // テスト数 20%
    failureRate: 0.1    // 失敗数 10%
  };
  
  // 各指標の正規化スコア (0-100)
  const passRateScore = Math.max(0, Math.min(100, passRate));
  const coverageScore = Math.max(0, Math.min(100, coverage));
  
  // テスト数が十分か評価（目標: 150以上）
  const testVolumeScore = Math.min(100, Math.max(0, (testCount / 150) * 100));
  
  // 失敗数が許容範囲か評価
  const failureRateScore = Math.max(0, 100 - (failedCount * 10));
  
  // 重み付き総合スコアを計算
  const compositeScore = 
    (passRateScore * weights.passRate) +
    (coverageScore * weights.coverage) +
    (testVolumeScore * weights.testVolume) +
    (failureRateScore * weights.failureRate);
  
  console.log(`  Pass Rate Score: ${passRateScore} (weight: ${weights.passRate * 100}%)`);
  console.log(`  Coverage Score: ${coverageScore} (weight: ${weights.coverage * 100}%)`);
  console.log(`  Test Volume Score: ${testVolumeScore} (weight: ${weights.testVolume * 100}%)`);
  console.log(`  Failure Rate Score: ${failureRateScore} (weight: ${weights.failureRate * 100}%)`);
  console.log(`  Composite Score: ${Math.round(compositeScore)}`);
  
  // スコアをランクに変換
  let rank = 'E';  // Excellent = 低リスク
  let riskLevel = 'CRITICAL';
  
  if (compositeScore >= 95) {
    rank = 'A';
    riskLevel = 'LOW';
  } else if (compositeScore >= 85) {
    rank = 'B';
    riskLevel = 'LOW-MEDIUM';
  } else if (compositeScore >= 70) {
    rank = 'C';
    riskLevel = 'MEDIUM';
  } else if (compositeScore >= 50) {
    rank = 'D';
    riskLevel = 'HIGH';
  }
  
  return { rank, riskLevel, compositeScore };
}

/**
 * トレンド分析（過去データとの比較）
 */
function analyzeTrend(currentData, historyFile) {
  console.log('\n📊 Analyzing trends...');
  
  let history = [];
  if (existsSync(historyFile)) {
    try {
      history = JSON.parse(readFileSync(historyFile, 'utf-8'));
    } catch (e) {
      console.log('  Warning: Could not parse history file');
    }
  }
  
  if (history.length === 0) {
    console.log('  First data point (no history)');
    return { trend: 'STABLE', change: 0 };
  }
  
  const previousData = history[history.length - 1];
  const passRateChange = currentData.pass_rate - (previousData.pass_rate || 0);
  const coverageChange = currentData.coverage - (previousData.coverage || 0);
  
  let trend = 'STABLE';
  if (passRateChange > 2 || coverageChange > 2) {
    trend = 'IMPROVING';
  } else if (passRateChange < -2 || coverageChange < -2) {
    trend = 'DECLINING';
  }
  
  console.log(`  Pass Rate Change: ${passRateChange > 0 ? '+' : ''}${passRateChange}%`);
  console.log(`  Coverage Change: ${coverageChange > 0 ? '+' : ''}${coverageChange}%`);
  console.log(`  Trend: ${trend}`);
  
  return { trend, passRateChange, coverageChange };
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 Advanced KPI Collection - Pattern 3 Implementation');
  console.log('📋 Mode: REAL DATA ONLY (No Mock)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // 1. テストワークフロー実行から実テスト結果を取得
  const testData = await fetchTestResults();
  
  if (!testData) {
    console.log('\n❌ FATAL: No test results available');
    console.log('   Cannot generate KPI without actual test data');
    console.log('   Ensure test-matrix.yml has completed with results');
    process.exit(1);
  }
  
  // 2. テスト結果をパース
  const testResults = parseTestResults(testData);
  
  if (!testResults) {
    console.log('\n❌ FATAL: Could not parse test results');
    console.log('   Test data exists but could not be parsed');
    process.exit(1);
  }
  
  // 3. カバレッジデータを読み込む
  const coverage = readCoverageData();
  
  // 4. 実テスト結果を使用（Mock データなし）
  const passRate = testResults.passRate;
  const testCount = testResults.totalTests;
  const passed = testResults.passedTests;
  const failed = testResults.failedTests;
  
  console.log(`\n✅ Real test data loaded:`);
  console.log(`   Pass Rate: ${passRate}%`);
  console.log(`   Total Tests: ${testCount}`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Coverage: ${coverage}%`);
  
  // 5. AI Danger Rank を計算
  const { rank, riskLevel, compositeScore } = calculateAIDangerRank(
    passRate,
    coverage,
    testCount,
    failed
  );
  
  // 6. KPI データを構築
  const kpiData = {
    timestamp: new Date().toISOString(),
    pass_rate: passRate,
    test_count: testCount,
    passed: passed,
    failed: failed,
    coverage: coverage,
    ai_danger_rank: rank,
    risk_level: riskLevel,
    composite_score: Math.round(compositeScore),
    data_source: testData.source === 'test-matrix' ? 'TEST_MATRIX_ARTIFACT' : 'GITHUB_API',
    details: {
      test_source: testData.source,
      github_run_id: testData.runId || null
    }
  };
  
  // 7. 履歴ファイルを読み込む
  const historyFile = `${OUTPUT_DIR}/kpi-history.json`;
  const trend = analyzeTrend(kpiData, historyFile);
  kpiData.trend = trend.trend;
  kpiData.trend_details = {
    pass_rate_change: trend.passRateChange,
    coverage_change: trend.coverageChange
  };
  
  // 8. 最新 KPI を保存
  const latestFile = `${OUTPUT_DIR}/latest-kpi.json`;
  writeFileSync(latestFile, JSON.stringify(kpiData, null, 2));
  console.log(`\n✓ Saved: ${latestFile}`);
  
  // 9. 履歴に追加
  let history = [];
  if (existsSync(historyFile)) {
    try {
      history = JSON.parse(readFileSync(historyFile, 'utf-8'));
    } catch (e) {
      history = [];
    }
  }
  
  history.push(kpiData);
  
  // 90 日間の履歴を保持
  if (history.length > 90) {
    history = history.slice(-90);
  }
  
  writeFileSync(historyFile, JSON.stringify(history, null, 2));
  console.log(`✓ Saved: ${historyFile} (${history.length} records)`);
  
  // 10. サマリーを出力
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 KPI Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Pass Rate: ${passRate}% (${passed}/${testCount})`);
  console.log(`Coverage: ${coverage}%`);
  console.log(`AI Danger Rank: ${rank} (${riskLevel})`);
  console.log(`Composite Score: ${Math.round(compositeScore)}`);
  console.log(`Trend: ${trend.trend}`);
  console.log(`Data Source: ${kpiData.data_source}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // GitHub Actions output に出力
  if (process.env.GITHUB_OUTPUT) {
    const output = `kpi_data=${JSON.stringify(kpiData).replace(/"/g, '\\"')}\n`;
    writeFileSync(process.env.GITHUB_OUTPUT, output, { flag: 'a' });
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
