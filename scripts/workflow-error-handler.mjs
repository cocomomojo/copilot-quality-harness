#!/usr/bin/env node
/**
 * Workflow Error Handler - ワークフロー内でのエラー検出と通知を一元化
 * 
 * Usage:
 *   node scripts/workflow-error-handler.mjs validate-spec <spec-file> <issue-number>
 *   node scripts/workflow-error-handler.mjs validate-env [VAR_NAME1,VAR_NAME2...]
 *   node scripts/workflow-error-handler.mjs capture-error <error-type> <error-message>
 *   node scripts/workflow-error-handler.mjs generate-notification <error-category> <details-json>
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
 * Spec YML ファイルの検証
 * - ファイル存在確認
 * - 空ファイル確認
 * - YAML 形式確認
 * - 最小限の必須フィールド確認
 */
function validateSpec(specPath, issueNumber) {
  log(Colors.BLUE, `[VALIDATE] Spec file validation: ${specPath}`);

  if (!specPath || specPath.trim() === '') {
    log(Colors.RED, '❌ Error: SPEC_FILE is empty or undefined');
    return {
      valid: false,
      error: 'SPEC_FILE_EMPTY',
      message: 'Spec file path is empty. Check spec generation step.',
      severity: 'CRITICAL',
    };
  }

  // ファイル存在確認
  if (!fs.existsSync(specPath)) {
    log(Colors.RED, `❌ Error: Spec file not found: ${specPath}`);
    return {
      valid: false,
      error: 'SPEC_FILE_NOT_FOUND',
      message: `Spec file not found at path: ${specPath}`,
      severity: 'CRITICAL',
      remediation: `1. Check spec generation step in workflow logs\n2. Verify issue #${issueNumber} has valid acceptance criteria\n3. Re-run workflow`,
    };
  }

  // ファイルサイズ確認（最小 50 バイト以上）
  const stats = fs.statSync(specPath);
  if (stats.size < 50) {
    log(Colors.RED, `❌ Error: Spec file is too small (${stats.size} bytes)`);
    return {
      valid: false,
      error: 'SPEC_FILE_EMPTY',
      message: `Spec file is too small or empty (${stats.size} bytes)`,
      severity: 'CRITICAL',
      remediation: `Spec file must contain valid YAML content. Check issue #${issueNumber} acceptance criteria.`,
    };
  }

  // YAML 形式確認（最小限）
  const content = fs.readFileSync(specPath, 'utf-8');
  if (!content.includes('tests:') && !content.includes('feature:')) {
    log(Colors.YELLOW, `⚠️ Warning: Spec file may not be valid YAML (missing 'tests' or 'feature' key)`);
    return {
      valid: false,
      error: 'SPEC_FILE_INVALID_FORMAT',
      message: 'Spec file does not contain expected YAML structure (missing "tests" or "feature" key)',
      severity: 'HIGH',
      remediation: `Ensure spec YAML has 'feature' and 'tests' keys. Example:\nfeature: ".."\ntests:\n  e2e_tests: [...]`,
    };
  }

  // E2E テスト数確認
  const e2eMatch = content.match(/e2e_tests:\s*\n([\s\S]*?)(?:mocks:|seeds:|$)/);
  const e2eTests = e2eMatch ? (e2eMatch[1].match(/- id:/g) || []).length : 0;

  if (e2eTests === 0) {
    log(Colors.YELLOW, `⚠️ Warning: No E2E tests found in spec file`);
    return {
      valid: true,
      warning: 'NO_E2E_TESTS',
      message: 'Spec file contains no E2E tests. This may indicate issue acceptance criteria parsing issue.',
      severity: 'MEDIUM',
      e2eTestCount: 0,
      remediation: `Check issue #${issueNumber} for:\n1. Valid acceptance criteria in "### シナリオ" or "### 受入条件" format\n2. Ensure scenarios follow "When... Then..." pattern`,
    };
  }

  log(Colors.GREEN, `✅ Spec file validated: ${specPath} (${e2eTests} E2E tests)`);
  return {
    valid: true,
    message: `Spec file is valid (${e2eTests} E2E tests found)`,
    severity: 'INFO',
    e2eTestCount: e2eTests,
  };
}

/**
 * 環境変数の検証
 */
function validateEnv(varNames) {
  const vars = varNames.split(',').map(v => v.trim()).filter(v => v);
  log(Colors.BLUE, `[VALIDATE] Environment variables: ${vars.join(', ')}`);

  const missing = [];
  const values = {};

  for (const varName of vars) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
    } else {
      values[varName] = value;
    }
  }

  if (missing.length > 0) {
    log(Colors.RED, `❌ Error: Missing environment variables: ${missing.join(', ')}`);
    return {
      valid: false,
      error: 'ENV_VARS_MISSING',
      missing,
      message: `Missing environment variables: ${missing.join(', ')}`,
      severity: 'CRITICAL',
    };
  }

  log(Colors.GREEN, `✅ All required env vars present`);
  return {
    valid: true,
    message: 'All required environment variables are set',
    severity: 'INFO',
    values,
  };
}

/**
 * エラー情報をキャプチャして JSON に保存
 */
function captureError(errorType, errorMessage, context = {}) {
  log(Colors.RED, `[ERROR CAPTURE] ${errorType}: ${errorMessage}`);

  const errorRecord = {
    timestamp: new Date().toISOString(),
    type: errorType,
    message: errorMessage,
    context,
    workflowRunId: process.env.GITHUB_RUN_ID,
    workflowRunAttempt: process.env.GITHUB_RUN_ATTEMPT,
    workflowJob: process.env.GITHUB_JOB,
  };

  const errorLogFile = process.env.ERROR_LOG_FILE || '/tmp/workflow_errors.json';
  let errors = [];

  if (fs.existsSync(errorLogFile)) {
    try {
      errors = JSON.parse(fs.readFileSync(errorLogFile, 'utf-8'));
    } catch (e) {
      // ファイルが破損していた場合は新規作成
      errors = [];
    }
  }

  errors.push(errorRecord);
  fs.writeFileSync(errorLogFile, JSON.stringify(errors, null, 2));

  log(Colors.BLUE, `✅ Error logged to ${errorLogFile}`);
  return errorRecord;
}

/**
 * Issue コメント用の通知を生成
 */
function generateNotification(errorCategory, details) {
  const categoryInfo = {
    SPEC_GENERATION_FAILED: {
      emoji: '❌',
      title: 'テスト仕様生成に失敗',
      severity: 'CRITICAL',
    },
    SPEC_VALIDATION_FAILED: {
      emoji: '⚠️',
      title: '生成されたテスト仕様に問題',
      severity: 'HIGH',
    },
    TEST_GENERATION_FAILED: {
      emoji: '❌',
      title: 'テストコード生成に失敗',
      severity: 'CRITICAL',
    },
    TEST_EXECUTION_FAILED: {
      emoji: '❌',
      title: 'テスト実行に失敗',
      severity: 'HIGH',
    },
    GIT_PUSH_FAILED: {
      emoji: '❌',
      title: 'ブランチのプッシュに失敗',
      severity: 'CRITICAL',
    },
    PR_CREATION_FAILED: {
      emoji: '⚠️',
      title: 'PR 作成に失敗',
      severity: 'HIGH',
    },
    ENV_VARS_MISSING: {
      emoji: '❌',
      title: '環境変数が不足',
      severity: 'CRITICAL',
    },
  };

  const info = categoryInfo[errorCategory] || {
    emoji: '⚠️',
    title: 'ワークフロー実行中にエラーが発生',
    severity: 'UNKNOWN',
  };

  const detailsObj = typeof details === 'string' ? { message: details } : details;

  let notification = `## ${info.emoji} ${info.title}\n\n`;
  notification += `**エラーカテゴリ**: \`${errorCategory}\`\n`;
  notification += `**重大度**: ${info.severity}\n\n`;

  if (detailsObj.message) {
    notification += `**メッセージ**: ${detailsObj.message}\n\n`;
  }

  if (detailsObj.remediation) {
    notification += `### 対応方法\n${detailsObj.remediation}\n\n`;
  }

  if (detailsObj.workflowRunId) {
    notification += `### ログ確認\n`;
    notification += `[ワークフロー実行ログを確認](https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${detailsObj.workflowRunId})\n\n`;
  }

  notification += `*このメッセージは自動生成されました*`;

  return notification;
}

/**
 * CLI インターフェース
 */
const command = process.argv[2];
const args = process.argv.slice(3);

try {
  switch (command) {
    case 'validate-spec': {
      const specFile = args[0];
      const issueNumber = args[1];
      const result = validateSpec(specFile, issueNumber);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.valid ? 0 : 1);
      break;
    }

    case 'validate-env': {
      const varNames = args[0] || '';
      const result = validateEnv(varNames);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.valid ? 0 : 1);
      break;
    }

    case 'capture-error': {
      const errorType = args[0];
      const errorMessage = args[1];
      const contextStr = args[2];
      const context = contextStr ? JSON.parse(contextStr) : {};
      const result = captureError(errorType, errorMessage, context);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'generate-notification': {
      const category = args[0];
      const detailsStr = args[1] || '{}';
      const details = JSON.parse(detailsStr);
      details.workflowRunId = process.env.GITHUB_RUN_ID;
      const notification = generateNotification(category, details);
      console.log(notification);
      break;
    }

    default:
      log(Colors.YELLOW, `Unknown command: ${command}`);
      log(Colors.BLUE, `Available commands:`);
      log(Colors.BLUE, `  validate-spec <spec-file> <issue-number>`);
      log(Colors.BLUE, `  validate-env <VAR1,VAR2,...>`);
      log(Colors.BLUE, `  capture-error <error-type> <error-message> [context-json]`);
      log(Colors.BLUE, `  generate-notification <error-category> <details-json>`);
      process.exit(1);
  }
} catch (error) {
  log(Colors.RED, `❌ Unexpected error:`, error.message);
  process.exit(1);
}
