#!/usr/bin/env node

/**
 * Advanced KPI Collection Script - Pattern 3
 * 
 * リアルタイム実テスト結果の自動収集（Mock データ完全排除）
 * - test-matrix.yml からの実テスト結果を読み込み
 * - GitHub API からテスト実行詳細を取得
 * - 複合スコアで AI 危険度ランクを計算
 * - トレンド分析と 90 日履歴管理
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { mkdirSync } from 'node:fs';

const GITHUB_TOKEN = process.env.GH_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY || 'cocomomojo/copilot-quality-harness';
const INPUT_TEST_MATRIX_RUN_ID = process.env.TEST_MATRIX_RUN_ID || '';
const OUTPUT_DIR = process.argv[2] || 'qa/dashboard-data';

mkdirSync(OUTPUT_DIR, { recursive: true });

/**
 * 前回のワークフロー実行から kpi-history.json をダウンロード
 */
function downloadPreviousHistory() {
  try {
    console.log('\n📚 Attempting to download previous KPI history...');
    
    // 完了した update-dashboard 実行を取得（最新から順に）
    const runListCmd = `gh run list --workflow=update-dashboard.yml --limit=10 --json databaseId,status,conclusion -q '.[] | select(.status == "completed" and .conclusion == "success")'`;
    const runsJson = execSync(runListCmd, {
      encoding: 'utf-8',
      env: { ...process.env, GH_TOKEN: GITHUB_TOKEN }
    }).trim();
    
    if (!runsJson) {
      console.log('  ℹ️  No previous successful runs found');
      return null;
    }
    
    const runs = runsJson.split('\n').map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
    
    if (runs.length === 0) {
      console.log('  ℹ️  No completed runs found');
      return null;
    }
    
    console.log(`  Found ${runs.length} completed runs`);
    
    // 最新の完了した実行から kpi-data アーティファクトをダウンロード
    for (const run of runs) {
      const previousRunId = run.databaseId;
      console.log(`  Trying run ID: ${previousRunId}`);
      
      try {
        const downloadCmd = `gh run download ${previousRunId} --name kpi-data --dir /tmp/prev-kpi 2>&1`;
        execSync(downloadCmd, {
          encoding: 'utf-8',
          env: { ...process.env, GH_TOKEN: GITHUB_TOKEN }
        });
        
        const historyFile = '/tmp/prev-kpi/kpi-history.json';
        if (existsSync(historyFile)) {
          const history = JSON.parse(readFileSync(historyFile, 'utf-8'));
          console.log(`  ✓ Downloaded ${history.length} previous records from run ${previousRunId}`);
          return history;
        }
      } catch (e) {
        console.log(`  ⚠️  Run ${previousRunId}: ${e.message.split('\n')[0]}`);
        continue;
      }
    }
    
    console.log('  ℹ️  No artifact with kpi-data found in previous runs');
    return null;
  } catch (e) {
    console.log(`  ⚠️  Error downloading history: ${e.message.split('\n')[0]}`);
    return null;
  }
}

/**
 * test-matrix からアーティファクト経由でテスト結果を取得
 */
function fetchTestResults() {
  console.log('\n📊 Fetching actual test results from artifacts...');
  
  try {
    let run = null;

    if (INPUT_TEST_MATRIX_RUN_ID) {
      console.log(`  Using explicit test run ID: ${INPUT_TEST_MATRIX_RUN_ID}`);
      const viewCmd = `gh run view ${INPUT_TEST_MATRIX_RUN_ID} --json databaseId,conclusion,status,createdAt`;
      const viewOutput = execSync(viewCmd, {
        encoding: 'utf-8',
        env: { ...process.env, GH_TOKEN: GITHUB_TOKEN }
      }).trim();
      if (viewOutput) {
        run = JSON.parse(viewOutput);
      }
    } else {
      // 最新の test-matrix 実行を取得
      const cmd = `gh run list --workflow=test-matrix.yml --limit=1 --json databaseId,conclusion,status,createdAt -q '.[] | select(.conclusion != null)'`;
      const output = execSync(cmd, {
        encoding: 'utf-8',
        env: { ...process.env, GH_TOKEN: GITHUB_TOKEN }
      });
      run = JSON.parse(output.trim());
    }
    
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
      const downloadDir = `/tmp/test-results-${Date.now()}`;
      execSync(`gh run download ${runId} --name test-matrix-summary --dir ${downloadDir} 2>/dev/null`, {
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
      console.log(`  ℹ️  test-matrix-summary not found, trying API...`);
    }
    
    // Fallback: GitHub API で直接ジョブ情報を取得
    const jobsCmd = `gh run view ${runId} --json jobs`;
    const jobsOutput = execSync(jobsCmd, {
      encoding: 'utf-8',
      env: { ...process.env, GH_TOKEN: GITHUB_TOKEN }
    });
    
    const jobsData = JSON.parse(jobsOutput);
    const jobs = jobsData.jobs || [];
    
    if (jobs.length === 0) {
      console.log(`  ⚠️  No jobs found in workflow run`);
      return null;
    }
    
    console.log(`  ✓ Fetched ${jobs.length} jobs from API`);
    
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
    
    // total_tests が null/0 の場合は by_test_type から計算
    if (totalTests === 0 && summary.by_test_type) {
      console.log(`  ℹ️  Using by_test_type breakdown (total_tests is null/0)`);
      passedTests = 0;
      failedTests = 0;
      for (const type of ['unit', 'api', 'e2e', 'advanced']) {
        const typeData = summary.by_test_type[type];
        if (typeData) {
          passedTests += typeData.passed_tests || 0;
          failedTests += typeData.failed_tests || 0;
        }
      }
      totalTests = passedTests + failedTests;
    }
    
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
      
      return {
        totalTests,
        passedTests,
        failedTests,
        passRate,
        source: 'github-api'
      };
    } else {
      console.log(`  ⚠️  No test jobs found in workflow`);
      return null;
    }
  }
  
  return null;
}

/**
 * ローカルファイル、またはダウンロードされたアーティファクトからカバレッジデータを読み込む
 */
function extractCoverageFromData(data) {
  if (!data || typeof data !== 'object') return null;

  if (data.total && data.total.lines && typeof data.total.lines.pct === 'number') {
    return Math.round(data.total.lines.pct);
  }

  if (typeof data.coverage === 'number') {
    return Math.round(data.coverage);
  }

  // coverage-final.json (istanbul) format fallback
  const files = Object.values(data);
  if (files.length > 0 && files.every((f) => f && typeof f === 'object' && f.s && typeof f.s === 'object')) {
    let covered = 0;
    let total = 0;
    for (const file of files) {
      for (const count of Object.values(file.s)) {
        total += 1;
        if (typeof count === 'number' && count > 0) covered += 1;
      }
    }
    if (total > 0) {
      return Math.round((covered / total) * 100);
    }
  }

  return null;
}

function readCoverageData() {
  console.log('\n📈 Reading coverage data...');
  
  const possiblePaths = [
    // ローカルパス
    'frontend/coverage/coverage-summary.json',
    'backend/coverage/coverage-summary.json',
    'frontend/coverage/coverage-final.json',
    'backend/coverage/coverage-final.json',
    'coverage/coverage-final.json',
    'qa/test-management/coverage.json',
    // CI からダウンロードされたアーティファクトパス
    'artifacts/coverage-report-node-20/coverage/coverage-summary.json',
    'artifacts/coverage-report-node-20/coverage/coverage-final.json',
    'artifacts/coverage-report-node-20/coverage-final.json'
  ];
  
  for (const filePath of possiblePaths) {
    if (existsSync(filePath)) {
      try {
        const data = JSON.parse(readFileSync(filePath, 'utf-8'));
        const coverage = extractCoverageFromData(data);
        if (coverage !== null) {
          console.log(`  ✓ Found coverage: ${coverage}% (from ${filePath})`);
          return { coverage, source: `LOCAL_FILE:${filePath}` };
        }
      } catch (e) {
        // Continue to next path
      }
    }
  }
  
  console.log('  ℹ️  Coverage data not found locally');
  
  // アーティファクトから coverage を取得してみる
  try {
    console.log('  🔍 Searching in GitHub artifacts...');
    const cmd = `gh run list --workflow=test-matrix.yml --limit=3 --json databaseId,conclusion,status -q '.[] | select(.conclusion == "success")'`;
    const runsOutput = execSync(cmd, {
      encoding: 'utf-8',
      env: { ...process.env, GH_TOKEN: GITHUB_TOKEN }
    }).trim();
    
    if (!runsOutput) {
      console.log('  ℹ️  No successful test runs found');
      return { coverage: 0, source: 'NO_SUCCESSFUL_TEST_RUN' };
    }
    
    const runs = runsOutput.split('\n').map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
    
    const prioritizedRuns = [];
    if (INPUT_TEST_MATRIX_RUN_ID) {
      prioritizedRuns.push({ databaseId: INPUT_TEST_MATRIX_RUN_ID, conclusion: 'unknown' });
    }
    for (const run of runs) {
      if (!prioritizedRuns.find(r => String(r.databaseId) === String(run.databaseId))) {
        prioritizedRuns.push(run);
      }
    }

    for (const run of prioritizedRuns) {
      try {
        const tempDir = `/tmp/coverage-${run.databaseId}`;
        execSync(`gh run download ${run.databaseId} --name coverage-report-node-20 --dir ${tempDir} 2>/dev/null`, {
          encoding: 'utf-8',
          env: { ...process.env, GH_TOKEN: GITHUB_TOKEN }
        });

        const coverageFiles = [
          `${tempDir}/coverage/coverage-summary.json`,
          `${tempDir}/coverage-summary.json`,
          `${tempDir}/coverage/coverage-final.json`,
          `${tempDir}/coverage-final.json`
        ];

        for (const coverageFile of coverageFiles) {
          if (existsSync(coverageFile)) {
            const data = JSON.parse(readFileSync(coverageFile, 'utf-8'));
            const coverage = extractCoverageFromData(data);
            if (coverage !== null) {
              console.log(`  ✓ Found coverage: ${coverage}% (from artifact: run ${run.databaseId})`);
              return { coverage, source: `ARTIFACT_RUN:${run.databaseId}` };
            }
          }
        }
      } catch (e) {
        // Continue to next run
      }
    }
  } catch (e) {
    console.log(`  ⚠️  Could not fetch coverage from artifacts: ${e.message.split('\n')[0]}`);
  }
  
  console.log('  ℹ️  Using 0% as default coverage');
  return { coverage: 0, source: 'DEFAULT_ZERO_FALLBACK' };
}

/**
 * AI Danger Rank を計算
 */
function calculateAIDangerRank(passRate, coverage, testCount, failedCount) {
  console.log('\n⚠️  Calculating AI Danger Rank...');
  
  const weights = {
    passRate: 0.4,
    coverage: 0.3,
    testVolume: 0.2,
    failureRate: 0.1
  };
  
  const passRateScore = Math.max(0, Math.min(100, passRate));
  const coverageScore = Math.max(0, Math.min(100, coverage));
  const testVolumeScore = Math.min(100, Math.max(0, (testCount / 150) * 100));
  const failureRateScore = Math.max(0, 100 - (failedCount * 10));
  
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
  
  let rank = 'E';
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
 * トレンド分析
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
    return { trend: 'STABLE', passRateChange: 0, coverageChange: 0 };
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
  const testData = fetchTestResults();
  
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
  const coverageInfo = readCoverageData();
  const coverage = coverageInfo.coverage;
  
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
  console.log(`   Coverage Source: ${coverageInfo.source}`);
  
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
    data_source: testData.source === 'test-matrix-artifact' ? 'TEST_MATRIX_ARTIFACT' : 'GITHUB_API',
    details: {
      test_source: testData.source,
      github_run_id: testData.runId || null,
      coverage_source: coverageInfo.source,
      explicit_test_run_id: INPUT_TEST_MATRIX_RUN_ID || null
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
  
  // 9. 履歴に追加 (前回のデータを保持)
  let history = [];
  
  // 優先順位1: ローカルの既存履歴ファイル（workflow が pre-download した可能性）
  if (existsSync(historyFile)) {
    try {
      const localHistory = JSON.parse(readFileSync(historyFile, 'utf-8'));
      if (Array.isArray(localHistory) && localHistory.length > 0) {
        history = localHistory;
        console.log(`✓ Loaded ${history.length} records from local history file`);
      }
    } catch (e) {
      console.log(`  ⚠️  Local history file is invalid, skipping`);
    }
  }
  
  // 優先順位2: ワークフロー実行から artifact をダウンロード
  if (history.length === 0) {
    const previousHistory = downloadPreviousHistory();
    if (previousHistory && Array.isArray(previousHistory)) {
      history = previousHistory;
      console.log(`✓ Loaded ${history.length} records from previous workflow artifact`);
    }
  }
  
  // 新しい記録を追加
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
