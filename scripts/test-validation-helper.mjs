#!/usr/bin/env node
/**
 * Test Validation Helper - テスト実行結果の検証
 * 
 * Usage:
 *   node scripts/test-validation-helper.mjs check-test-output <output-file> <min-test-count>
 *   node scripts/test-validation-helper.mjs extract-failures <output-file>
 *   node scripts/test-validation-helper.mjs generate-test-report <output-file> [issue-number]
 */

import fs from 'fs';
import path from 'path';

const Colors = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  GREEN: '\x1b[32m',
};

function log(color, ...args) {
  console.log(color + args.join(' ') + Colors.RESET);
}

/**
 * テスト出力ファイルをチェック
 */
function checkTestOutput(outputFile, minTestCount = 3) {
  log(Colors.BLUE, `[TEST CHECK] Analyzing test output: ${outputFile}`);

  if (!fs.existsSync(outputFile)) {
    log(Colors.RED, `❌ Test output file not found: ${outputFile}`);
    return {
      valid: false,
      error: 'OUTPUT_FILE_NOT_FOUND',
      message: 'Test output file not found',
      severity: 'CRITICAL',
    };
  }

  const content = fs.readFileSync(outputFile, 'utf-8');

  // Check for common test failure patterns
  const failurePatterns = [
    { pattern: /FAIL|failed/i, type: 'FAILED_TESTS' },
    { pattern: /error:/i, type: 'ERROR_OUTPUT' },
    { pattern: /TypeError|SyntaxError|ReferenceError/i, type: 'JAVASCRIPT_ERROR' },
    { pattern: /ENOENT|EACCES|file not found/i, type: 'FILE_ERROR' },
    { pattern: /Cannot find module/i, type: 'MODULE_ERROR' },
    { pattern: /timeout|timed out/i, type: 'TIMEOUT_ERROR' },
  ];

  const detectedIssues = [];
  for (const { pattern, type } of failurePatterns) {
    if (pattern.test(content)) {
      detectedIssues.push(type);
    }
  }

  // Try to extract test counts
  const passMatch = content.match(/(\d+)\s+(?:passed|passing)/i);
  const failMatch = content.match(/(\d+)\s+(?:failed|failing)/i);
  const testMatch = content.match(/(\d+)\s+test/i);

  const passedTests = passMatch ? parseInt(passMatch[1]) : 0;
  const failedTests = failMatch ? parseInt(failMatch[1]) : 0;
  const totalTests = testMatch ? parseInt(testMatch[1]) : (passedTests + failedTests);

  log(Colors.BLUE, `📊 Test results: ${passedTests} passed, ${failedTests} failed, ${totalTests} total`);

  // Validate
  if (detectedIssues.length > 0) {
    log(Colors.RED, `❌ Detected test issues: ${detectedIssues.join(', ')}`);
    return {
      valid: false,
      error: 'TEST_EXECUTION_FAILED',
      issues: detectedIssues,
      message: `Test execution failed with issues: ${detectedIssues.join(', ')}`,
      severity: 'HIGH',
      testResults: {
        passed: passedTests,
        failed: failedTests,
        total: totalTests,
      },
      remediation: `1. Review [workflow logs](#) for detailed error messages\n2. Check generated test files for syntax errors\n3. Ensure all dependencies are correctly mocked\n4. Verify test environment setup (NODE_ENV, etc.)`,
    };
  }

  if (totalTests < minTestCount) {
    log(Colors.YELLOW, `⚠️ Warning: Only ${totalTests} tests generated (expected >= ${minTestCount})`);
    return {
      valid: true,
      warning: 'LOW_TEST_COUNT',
      message: `Only ${totalTests} tests were generated (expected >= ${minTestCount})`,
      severity: 'MEDIUM',
      testResults: {
        passed: passedTests,
        failed: failedTests,
        total: totalTests,
      },
    };
  }

  if (passedTests === 0 && totalTests > 0) {
    log(Colors.YELLOW, `⚠️ Warning: No tests passed out of ${totalTests} tests`);
    return {
      valid: false,
      error: 'ALL_TESTS_FAILED',
      message: `All ${totalTests} tests failed`,
      severity: 'CRITICAL',
      testResults: {
        passed: passedTests,
        failed: failedTests,
        total: totalTests,
      },
    };
  }

  log(Colors.GREEN, `✅ Test output looks valid (${passedTests}/${totalTests} passed)`);
  return {
    valid: true,
    message: `Tests executed successfully (${passedTests}/${totalTests} passed)`,
    severity: 'INFO',
    testResults: {
      passed: passedTests,
      failed: failedTests,
      total: totalTests,
    },
  };
}

/**
 * テスト失敗の詳細情報を抽出
 */
function extractFailures(outputFile) {
  log(Colors.BLUE, `[EXTRACT] Extracting test failures from: ${outputFile}`);

  if (!fs.existsSync(outputFile)) {
    return { failures: [], error: 'File not found' };
  }

  const content = fs.readFileSync(outputFile, 'utf-8');
  const lines = content.split('\n');

  const failures = [];
  let currentFailure = null;

  for (const line of lines) {
    // Look for FAIL or failure indicators
    if (line.match(/FAIL|●\s/)) {
      if (currentFailure) {
        failures.push(currentFailure);
      }
      currentFailure = {
        title: line.replace(/^.*?(FAIL|●)\s+/, '').trim(),
        details: [],
      };
    } else if (currentFailure && line.match(/Error:|expected|received|at |TypeError/)) {
      currentFailure.details.push(line.trim());
    }
  }

  if (currentFailure) {
    failures.push(currentFailure);
  }

  log(Colors.GREEN, `Found ${failures.length} test failures`);
  return { failures, count: failures.length };
}

/**
 * テストレポートを生成
 */
function generateTestReport(outputFile, issueNumber) {
  log(Colors.BLUE, `[REPORT] Generating test report from: ${outputFile}`);

  const checkResult = checkTestOutput(outputFile, 1);
  const failureDetails = extractFailures(outputFile);

  let report = `## 📋 テスト実行レポート\n\n`;

  if (issueNumber) {
    report += `**Issue**: #${issueNumber}\n`;
  }

  report += `**テスト実行時刻**: ${new Date().toISOString()}\n\n`;

  // Summary
  report += `### 📊 実行サマリー\n`;
  if (checkResult.testResults) {
    const { passed, failed, total } = checkResult.testResults;
    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
    report += `- **総テスト数**: ${total}\n`;
    report += `- **成功**: ${passed} ✅\n`;
    report += `- **失敗**: ${failed} ❌\n`;
    report += `- **成功率**: ${percentage}%\n\n`;
  }

  // Status
  report += `### 🎯 実行結果\n`;
  if (checkResult.valid) {
    report += `**ステータス**: ✅ 成功\n`;
  } else {
    report += `**ステータス**: ❌ 失敗\n`;
    report += `**エラー**: \`${checkResult.error}\`\n`;
    if (checkResult.issues) {
      report += `**検出された問題**: ${checkResult.issues.join(', ')}\n`;
    }
    report += `\n`;
  }

  // Failures
  if (failureDetails.count > 0) {
    report += `### ❌ 失敗したテスト (${failureDetails.count})\n`;
    report += `\`\`\`\n`;
    for (const failure of failureDetails.failures.slice(0, 5)) {
      report += `${failure.title}\n`;
      if (failure.details.length > 0) {
        report += `  ${failure.details.slice(0, 2).join('\n  ')}\n`;
      }
    }
    if (failureDetails.count > 5) {
      report += `... and ${failureDetails.count - 5} more failures\n`;
    }
    report += `\`\`\`\n\n`;
  }

  // Remediation
  if (checkResult.remediation) {
    report += `### 🔧 対応方法\n${checkResult.remediation}\n\n`;
  }

  report += `*レポート自動生成*`;

  return report;
}

/**
 * CLI インターフェース
 */
const command = process.argv[2];
const args = process.argv.slice(3);

try {
  switch (command) {
    case 'check-test-output': {
      const outputFile = args[0];
      const minCount = parseInt(args[1] || '3');
      const result = checkTestOutput(outputFile, minCount);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.valid ? 0 : 1);
      break;
    }

    case 'extract-failures': {
      const outputFile = args[0];
      const result = extractFailures(outputFile);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'generate-test-report': {
      const outputFile = args[0];
      const issueNumber = args[1];
      const report = generateTestReport(outputFile, issueNumber);
      console.log(report);
      break;
    }

    default:
      log(Colors.YELLOW, `Unknown command: ${command}`);
      log(Colors.BLUE, `Available commands:`);
      log(Colors.BLUE, `  check-test-output <output-file> [min-test-count]`);
      log(Colors.BLUE, `  extract-failures <output-file>`);
      log(Colors.BLUE, `  generate-test-report <output-file> [issue-number]`);
      process.exit(1);
  }
} catch (error) {
  log(Colors.RED, `❌ Unexpected error:`, error.message);
  process.exit(1);
}
