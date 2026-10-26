#!/usr/bin/env node

/**
 * generate-spec-from-issue.mjs
 * 
 * Issue の受け入れ基準（Given/When/Then 形式）から テスト仕様 YAML を生成します
 * 
 * 使用方法:
 *   node scripts/generate-spec-from-issue.mjs \
 *     --issue-file /path/to/issue.json \
 *     --issue-number 42 \
 *     --repo-root . \
 *     --output-dir tests/specs
 * 
 * 出力:
 *   tests/specs/{feature-name}.yml
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// CLI Arguments Parsing
// ============================================================

function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      if (!value || value.startsWith('--')) {
        result[key] = true;
      } else {
        result[key] = value;
        i++;
      }
    }
  }
  return result;
}

// ============================================================
// Issue から Given/When/Then を抽出
// ============================================================

function extractAcceptanceCriteria(issueBody) {
  /**
   * Issue body から Given/When/Then 形式の受け入れ基準を抽出します
   * 
   * 期待フォーマット:
   * ### シナリオ 1: ...
   * \`\`\`
   * Given: ...
   * When: ...
   * Then:
   *   - ...
   * \`\`\`
   */
  
  const scenarios = [];
  const codeBlockRegex = /^```\s*\n([\s\S]*?)\n```/gm;
  
  let match;
  while ((match = codeBlockRegex.exec(issueBody)) !== null) {
    const block = match[1];
    const lines = block.split(/\r?\n/);
    let currentSection = null;
    let given = '';
    let whenText = '';
    const thenResults = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (/^Given:\s*/.test(trimmed)) {
        currentSection = 'given';
        given = trimmed.replace(/^Given:\s*/, '').trim();
        continue;
      }

      if (/^When:\s*/.test(trimmed)) {
        currentSection = 'when';
        whenText = trimmed.replace(/^When:\s*/, '').trim();
        continue;
      }

      if (/^Then:\s*/.test(trimmed)) {
        currentSection = 'then';
        const thenValue = trimmed.replace(/^Then:\s*/, '').trim();
        if (thenValue) thenResults.push(thenValue);
        continue;
      }

      if (currentSection === 'then' && trimmed.startsWith('-')) {
        thenResults.push(trimmed.replace(/^-\s*/, '').trim());
      }
    }

    if (given && whenText && thenResults.length > 0) {
      scenarios.push({
        given,
        when: whenText,
        then: thenResults
      });
    }
  }
  
  return scenarios;
}

// ============================================================
// Feature名の生成
// ============================================================

function generateFeatureName(issueTitle) {
  /**
   * Issue タイトルから feature 名を生成します
   * 例: "ユーザー登録フロー" → "user-registration"
   */

  const sanitized = String(issueTitle || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ぁ-んァ-ン]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);

  if (!sanitized || /^a+$/.test(sanitized)) {
    return `feature-${Date.now()}`;
  }

  return sanitized;
}

// ============================================================
// YML スペック生成
// ============================================================

function yamlString(value) {
  return JSON.stringify(String(value ?? ''));
}

function generateYamlSpec(issue, scenarios) {
  /**
   * Given/When/Then シナリオから YAML スペックを生成します
   */
  
  const featureName = generateFeatureName(issue.title);
  const timestamp = new Date().toISOString();
  
  // シナリオから UT と E2E を生成
  const unitTests = [];
  const e2eTests = [];
  
  scenarios.forEach((scenario, idx) => {
    const scenarioId = idx + 1;
    
    // E2E テストケース
    e2eTests.push({
      id: `E2E-${String(scenarioId).padStart(3, '0')}`,
      title: `シナリオ ${scenarioId}: ${scenario.given.substring(0, 30)}...`,
      description: `Given: ${scenario.given}\nWhen: ${scenario.when}\nThen: ${scenario.then.join(', ')}`,
      priority: scenarioId === 1 ? 'critical' : 'high',
      steps: generateE2ESteps(scenario)
    });
  });
  
  // YAML ヘッダーとコンテンツ
  const descriptionText = issue.title
    ? `${issue.title} (generated from issue acceptance criteria)`
    : 'Auto-generated feature description';

  const yamlContent = `# テスト設計テンプレ - ${issue.title}
# 目的: Copilot が UT と E2E を自動生成するための構造化テスト仕様
# 用途: tests/specs/*.yml として配置。Copilot に読み取られ、テストコード自動生成の入力となる
# Issue: Closes ${issue.number ? '#' + issue.number : 'cocomomojo/copilot-quality-harness#XX'}
# Generated: ${timestamp}

feature: ${yamlString(issue.title)}
description: ${yamlString(descriptionText)}
component: "auto-generated-component"
requires_human_approval: false

# ============================================================
# テスト定義（生成器の期待する形式）
# ============================================================
tests:
  unit_tests:
    - id: "UT-001"
      title: "プレースホルダー: 自動生成用ユニットテスト"
      category: "auto_generated"
      input: {}
      expected_output:
        success: true
      mock_dependencies: []

  e2e_tests:
${e2eTests.map(test => generateE2EYaml(test)).join('\n')}

mocks: []

seeds:
  - name: "base_seed"
    value: ${Math.floor(Date.now() / 1000)}
    description: "基本シード値（テストデータ生成用）"

environment:
  API_BASE_URL: "http://localhost:3000"
  TEST_DB_URL: "sqlite:///:memory:"

coverage_requirements:
  - component: "auto-generated-component"
    target_percentage: 90
    critical_paths:
      - "Auto-generated critical path"

execution:
  timeout_ms: 30000
  retry_on_flake:
    enabled: true
    max_attempts: 3
    backoff_ms: 1000
  parallel_execution:
    enabled: true
    max_workers: 4
  failure_mode: "fast_fail"

references:
  - ".github/ISSUE_TEMPLATE/acceptance.md"
  - "CONTRIBUTING.md"
  - "QA_POLICY.md"

notes: |
  - This spec was auto-generated from Issue #${issue.number || 'XX'}
  - E2E テストは必ずモック環境で実行してください（外部 API 非依存）
  - テスト後は自動で DB がロールバックされます
  - 手動でテストケースを追加・修正してください
`;

  return {
    featureName,
    filename: `${featureName}.yml`,
    content: yamlContent
  };
}

// ============================================================
// E2E ステップ生成
// ============================================================

function generateE2ESteps(scenario) {
  const steps = [];
  
  // Given フェーズ
  steps.push({
    step_id: 1,
    action: "setup",
    target: scenario.given.substring(0, 100),
    expected: { setup_complete: true }
  });
  
  // When フェーズ
  steps.push({
    step_id: 2,
    action: "execute",
    target: scenario.when.substring(0, 100),
    expected: { execution_started: true }
  });
  
  // Then フェーズ
  scenario.then.forEach((assertion, idx) => {
    steps.push({
      step_id: 3 + idx,
      action: "assert",
      target: assertion.substring(0, 100),
      expected: { assertion_passed: true }
    });
  });
  
  return steps;
}

// ============================================================
// E2E YAML 生成
// ============================================================

function generateE2EYaml(test) {
  const stepsYaml = test.steps.map(step => 
    `        - step_id: ${step.step_id}
          action: ${yamlString(step.action)}
          target: ${yamlString(step.target)}
          expected:
            - assertion_passed: true`
  ).join('\n');
  
  return `    - id: ${yamlString(test.id)}
      title: ${yamlString(test.title)}
      description: ${yamlString(test.description)}
      priority: ${yamlString(test.priority)}
      steps:
${stepsYaml}`;
}

// ============================================================
// メイン処理
// ============================================================

async function main() {
  const args = parseArgs(process.argv.slice(2));
  
  const issueFile = args['issue-file'];
  const issueNumber = args['issue-number'];
  const repoRoot = args['repo-root'] || '.';
  const outputDir = args['output-dir'] || 'tests/specs';
  
  if (!issueFile) {
    console.error('❌ Error: --issue-file is required');
    process.exit(1);
  }
  
  // Issue ファイルを読む
  let issueData;
  try {
    const issueContent = fs.readFileSync(issueFile, 'utf8');
    issueData = JSON.parse(issueContent);
  } catch (error) {
    console.error(`❌ Error reading issue file: ${error.message}`);
    process.exit(1);
  }
  
  // 受け入れ基準を抽出
  const scenarios = extractAcceptanceCriteria(issueData.body || '');
  
  if (scenarios.length === 0) {
    console.warn('⚠️ Warning: No Given/When/Then scenarios found in Issue');
  }
  
  // YAML スペックを生成
  const spec = generateYamlSpec(issueData, scenarios);
  
  // 出力ディレクトリを作成
  const outputPath = path.join(repoRoot, outputDir);
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  
  // ファイルに書き込む
  const filePath = path.join(outputPath, spec.filename);
  fs.writeFileSync(filePath, spec.content, 'utf8');
  
  console.log(`✅ Generated test spec: ${filePath}`);
  console.log(`   Feature: ${spec.featureName}`);
  console.log(`   Scenarios: ${scenarios.length}`);
  console.log(`   E2E Tests: ${spec.content.split('id: "E2E-').length - 1}`);
  
  // Workflow 出力として設定
  const relativeFilePath = path.relative(repoRoot, filePath);
  console.log(`::set-output name=spec_file::${relativeFilePath}`);
  console.log(`::set-output name=feature_name::${spec.featureName}`);

  // GitHub Actions output format
  const outputEnv = process.env.GITHUB_OUTPUT;
  if (outputEnv) {
    fs.appendFileSync(outputEnv, `spec_file=${relativeFilePath}\n`);
    fs.appendFileSync(outputEnv, `feature_name=${spec.featureName}\n`);
  }
}

main().catch(error => {
  console.error(`❌ Fatal error: ${error.message}`);
  process.exit(1);
});
