# Dynamic Workflows CI/CD Implementation Guide

This document describes the Dynamic Workflows CI/CD system implemented for the copilot-quality-harness project.

## Overview

Five coordinated GitHub Actions workflows provide comprehensive quality assurance:

```
PR/Push Event
    ↓
┌─────────────────────────────────────┐
│  test-coverage-analysis.yml         │ ← Analyzes coverage gaps (matrix: Node 18, 20)
│  auto-code-review.yml               │ ← Extended code review (linting + test impact)
│  test-matrix.yml                    │ ← Parallel tests (4 × 2 combinations)
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  quality-report-pr.yml              │ ← Aggregates results → PR comment
└─────────────────────────────────────┘

Weekly Friday 5:00 AM JST
    ↓
┌─────────────────────────────────────┐
│  quality-schedule.yml               │ ← Comprehensive validation + issue creation
└─────────────────────────────────────┘
```

## Workflow Details

### 1. test-coverage-analysis.yml

**Purpose**: Analyze test coverage gaps and provide quality metrics.

**Trigger Events**:
- `push` to main branch
- `pull_request` (all events)

**Key Features**:
- **Matrix Strategy**: Tests across Node.js versions 18 and 20
- **Test Execution**: Runs unit, API, and advanced tests
- **Coverage Analysis**: Parses test output to calculate:
  - Gap score (100 - pass rate)
  - Critical gaps detection (>10% gap)
  - Per-test-type breakdown
- **Artifact Upload**: Coverage analysis JSON per node version (5-day retention)
- **Dynamic Outputs**: Exports `gap_score`, `coverage_score`, `critical_gaps` for downstream jobs

**Output Structure**:
```json
{
  "node_version": "20",
  "timestamp": "2026-10-11T18:48:59Z",
  "test_results": {
    "unit": { "passed": 10, "failed": 0, "skipped": 2 },
    "api": { "passed": 5, "failed": 0, "skipped": 0 },
    "advanced": { "passed": 8, "failed": 1, "skipped": 0 }
  },
  "total_tests": 23,
  "coverage_score": 95
}
```

### 2. auto-code-review.yml

**Purpose**: Automated code quality review complementing manual review.

**Trigger Events**:
- `pull_request` opened, synchronized, reopened, ready_for_review, edited

**Key Features**:
- **Linting Check**: 
  - Runs full `npm run lint` across workspaces
  - Parses error/warning counts
  - Flags critical issues
- **Test Coverage Impact Analysis**:
  - Compares test-file changes to source-file changes
  - Calculates test coverage ratio for PR
  - Flags if ratio < 20%
- **Draft PR Skipping**: Respects author intent by skipping draft PRs
- **PR Comment**: Posts structured review comment with findings

**Review Comment Includes**:
- ✅/⚠️ Linting status and counts
- Test coverage ratio and adequacy indicator
- Guidance for developer

### 3. test-matrix.yml

**Purpose**: Execute tests in parallel using matrix strategy for fast feedback.

**Trigger Events**:
- `push` to main, develop branches
- `pull_request` (all events)

**Key Features**:
- **Matrix Dimensions**:
  - Node versions: 18, 20
  - Test types: unit, api, e2e, advanced
  - Total: 8 parallel jobs
- **Test Execution**: 
  - Each job runs its specific test type
  - E2E installs Playwright dependencies dynamically
  - Continues on error for visibility
- **Result Parsing**:
  - Extracts passed/failed/skipped counts per job
  - Generates per-matrix JSON artifacts
- **Artifact Collection**:
  - Uploads individual results (8 artifacts)
  - Generates summary JSON with aggregated metrics
- **Dynamic Outputs**: 
  - `status` (passed/failed)
  - Passed/failed counts per matrix combination

**Summary JSON**:
```json
{
  "total_combinations": 8,
  "passed_combinations": 7,
  "failed_combinations": 1,
  "total_tests": 187,
  "total_passed": 185,
  "total_failed": 2,
  "by_node_version": {
    "18": { "passed_tests": 92, "failed_tests": 1, "status": "some_failed" },
    "20": { "passed_tests": 93, "failed_tests": 1, "status": "some_failed" }
  },
  "by_test_type": {
    "unit": { "passed_tests": 50, "failed_tests": 0, "status": "all_passed" },
    "api": { "passed_tests": 30, "failed_tests": 0, "status": "all_passed" },
    "e2e": { "passed_tests": 40, "failed_tests": 2, "status": "some_failed" },
    "advanced": { "passed_tests": 65, "failed_tests": 0, "status": "all_passed" }
  }
}
```

### 4. quality-report-pr.yml

**Purpose**: Aggregate test results and post quality summary to PR.

**Trigger Events**:
- `workflow_run` when `test-matrix.yml` completes

**Key Features**:
- **Artifact Download**: Retrieves all test results from test-matrix run
- **Report Generation**:
  - Merges results from 8 matrix combinations
  - Calculates aggregated pass rate
  - Formats markdown table (Node versions × test types)
- **Dynamic Table**:
  ```
  | Node Version | Unit Tests | API Tests | E2E Tests | Advanced Tests |
  |---|---|---|---|---|
  | Node 18 | ✅ 25P/0F | ✅ 15P/0F | ⚠️ 20P/1F | ✅ 33P/0F |
  | Node 20 | ✅ 25P/0F | ✅ 15P/0F | ⚠️ 20P/1F | ✅ 32P/0F |
  ```
- **PR Comment**: Posts comment with:
  - Overall pass rate percentage
  - Status emoji (✅ vs ⚠️)
  - Detailed matrix table
  - Timestamp
- **Smart PR Detection**: Finds PR by workflow branch name

### 5. quality-schedule.yml

**Purpose**: Regular comprehensive quality validation (scheduled weekly).

**Trigger Events**:
- `schedule`: Every Friday 5:00 AM JST (cron: `0 20 * * 4`)
- Manual trigger via `workflow_dispatch`

**Key Features**:
- **Cron Schedule**: Thursday 20:00 UTC = Friday 5:00 AM JST
- **Matrix Testing**: Node 18 and 20 with full test suite
- **Comprehensive Analysis**:
  - Runs all test suites sequentially
  - Captures pass rates by node version
  - Generates analysis report
- **Issue Creation**:
  - Creates GitHub issue if pass rate < 100%
  - Tags: `ci-failure`, `quality-check`
  - Links to workflow run
- **Artifact Retention**: 30-day retention for trend analysis
- **Summary Report**: Outputs average pass rate and per-version breakdown

**Issue Template** (created when failures detected):
```
🚨 Scheduled Quality Check Failed

Date: 2026-10-11T20:00:00Z
Average Pass Rate: 95%

Action Required
- Review test failures in the scheduled quality run
- Check the workflow artifacts for detailed results
- Address critical issues before next scheduled run
```

## Integration with Existing Workflows

### With ai-review.yml
- **auto-code-review.yml** complements ai-review.yml (not replacing)
- Both provide different perspectives on code quality
- ai-review.mjs handles AI-specific analysis
- auto-code-review focuses on linting and test coverage

### With quality.yml
- **test-coverage-analysis.yml** and **test-matrix.yml** absorb the testing aspects
- Keep quality.yml for quick baseline checks on push
- New workflows provide matrix dimension for better failure isolation

### With scripts/
- **quality-report.mjs**: Unchanged, can be extended for artifact input
- **ai-review.mjs**: Used by ai-review.yml, not affected
- **m2-validation.mjs**: Included in scheduled workflow

## Dynamic Features

### 1. Matrix Strategy Benefits
- **Isolation**: Failure in one matrix combo doesn't block others
- **Speed**: 8 parallel jobs complete faster than sequential
- **Clarity**: Error reports clearly identify version/test-type combo
- **Trends**: Track performance across Node versions

### 2. Conditional Job Flow
- E2E tests only on main/develop (save time on feature PRs)
- Draft PR review skipped (respect author)
- Report posting only if PR found

### 3. Dynamic Outputs
- Jobs export status/counts for downstream logic
- Summary job uses outputs to decide issue creation
- PR report uses merged results for table generation

### 4. Artifact Management
- Per-matrix-combination uploads for detailed debugging
- Retention policies: 5 days (dev), 30 days (scheduled)
- Automated download/merge in report job

## Troubleshooting

### Matrix job fails for one combo
- Check artifact for that specific Node version
- Example: `test-results-node-20-e2e.json`
- Doesn't block other matrix combinations

### PR comment not posting
- Verify PR exists for the branch
- Check workflow-run PR detection logic
- View workflow logs for GitHub API errors

### Scheduled job doesn't run
- Verify cron syntax: `0 20 * * 4` (Thursday 20:00 UTC)
- Check repository settings (Actions enabled)
- Scheduled workflows only run on default branch

### Coverage gap score seems wrong
- Check test output parsing logic in coverage-analysis step
- Verify test framework output matches regex patterns
- Review coverage-analysis artifact for raw stats

## Best Practices

1. **Monitor Matrix Results**: Check test-matrix-summary.json trends over time
2. **Review Weekly Reports**: Friday scheduled run provides trend analysis
3. **Act on Issues**: Scheduled workflow creates issues for failures
4. **PR Comments**: Use quality report table to identify version-specific issues
5. **Coverage Trends**: Track coverage-score over time across PRs

## Appendix: copilot-analyze-trace.yml（Playwright トレース解析 PoC）

### Overview（概要）

Playwright テスト失敗時に、トレース（trace artifact）を自動解析し、Copilot が修正案を生成する PoC ワークフロー。

**目的**: CI 失敗の根本原因を自動特定し、修正方針を迅速に提示

**実行モード**: 手動トリガー（`workflow_dispatch`）で安全に PoC 検証後、PR トリガーに拡張予定

**出力**: Draft PR（自動マージなし）+ Copilot による修正案 3 案

### 実行フロー

```
1. Manual Trigger (workflow_dispatch)
   │
2. Artifact Download: Playwright trace.zip
   │
3. Run: scripts/trace-summary.ts
   ├─ Trace をパース
   ├─ 失敗原因抽出（test, locator, errors）
   ├─ failure_category に分類（4 種類）
   ├─ PII・秘密情報除外
   └─ trace-summary.json 出力
   │
4. Copilot Dynamic Workflows
   ├─ trace-summary.json を入力
   ├─ 日本語で失敗要約（3行）
   ├─ 修正案 3 案生成
   │  ├─ 修正案 1: 目的 / 変更箇所 / コードスニペット / リスク / 検証手順
   │  ├─ 修正案 2: （同上）
   │  └─ 修正案 3: （同上）
   └─ analysis.json 出力
   │
5. Draft PR Creation
   ├─ Branch: copilot-suggest/<timestamp>
   ├─ Label: copilot-suggestion
   ├─ Content: 修正案 Markdown
   ├─ Status: Draft（自動マージなし）
   └─ Reviewers: 自動割当て
   │
6. Human Review (Required)
   ├─ 修正案の内容確認
   ├─ 対応する案を選択
   ├─ ローカルで実装・テスト
   ├─ CI で全テスト成功確認
   └─ Draft → Review 状態に変更してマージ
```

### 入力仕様（workflow_dispatch）

| パラメータ | 説明 | デフォルト | 必須 |
|-----------|------|----------|------|
| `artifact_name` | Trace artifact 名（例: playwright-report） | `playwright-report` | No |
| `artifact_id` | Artifact ID（オプション、短縮形） | - | No |

### 出力仕様

#### 1. `trace-summary.json`（必須キー）

Playwright トレースから抽出したテスト失敗情報

```json
{
  "failure_reason": "Test 'login' failed with timeout: waitForSelector exceeded 5s",
  "failing_test": "login",
  "failing_locator": "button[data-testid='submit']",
  "top_console_errors": ["Timeout: waitForSelector exceeded 5000ms", "Element not visible"],
  "top_network_failures": ["GET /api/auth failed with 504 Gateway Timeout"],
  "screenshot_paths": ["trace-artifacts/screenshot-1.png"],
  "trace_excerpt": "... 最大 2000 文字のテキスト ...",
  "failure_category": "timeout",
  "timestamp": "2026-10-12T10:54:47.232Z"
}
```

**failure_category**: 以下 4 カテゴリのいずれか
- `timeout`: waitFor 関数のタイムアウト
- `network_error`: ネットワーク通信エラー
- `element_not_found`: Locator がページに見つからない
- `assertion_failure`: 値の検証失敗

#### 2. `analysis.json`（Copilot 出力）

```json
{
  "summary": "ログイン画面でのタイムアウトが原因。ネットワーク遅延により submit ボタンの待機時間不足。",
  "solutions": [
    {
      "title": "タイムアウト時間の延長",
      "priority": "高",
      "purpose": "テスト実行時のタイムアウトエラーを解決",
      "changed_files": ["e2e/login.spec.ts"],
      "patch": "- await page.waitForSelector(..., { timeout: 5000 })\n+ await page.waitForSelector(..., { timeout: 10000 })",
      "risk": "テスト実行時間が増加（約 1 分）",
      "verify": ["ローカルで再現テスト実行", "CI で全テスト成功確認"]
    }
  ]
}
```

#### 3. Draft PR 本文

- Markdown 形式
- 失敗要約（日本語）
- 各修正案の詳細（目的 / コード / リスク / 検証手順）
- 推奨アクション（人間レビューの必須性を明示）

### セキュリティ機能

✅ **シークレット自動除外**:
- API キー（40 文字パターン）
- Bearer トークン
- パスワード
- メールアドレス、電話番号
- IP アドレス

✅ **ログ安全化**:
- ワークフロー出力に `GITHUB_TOKEN` マスク設定
- 秘密情報は `[REDACTED]` に置き換え

✅ **自動マージなし**:
- Draft PR のみ作成
- `gh pr merge --auto` は実行しない
- 人間レビュー必須

### 制約

| 項目 | 値 |
|------|-----|
| **言語** | 日本語（すべての出力） |
| **トレース要約** | 最大 2000 文字 |
| **修正案数** | 最大 3 案 |
| **失敗分類** | 4 カテゴリ |
| **自動マージ** | 禁止 |
| **人間確認** | 必須 |

### トラブルシューティング

| 症状 | 原因 | 解決方法 |
|------|------|---------|
| Artifact がない | artifact 名が違う / artifact 削除済み | `artifact_name` 入力を正確に指定 |
| trace-summary.ts エラー | trace ファイル形式が非標準 | trace ファイルを確認 / console を確認 |
| Copilot が応答しない | ネットワーク遅延 / API 制限 | リトライするか、ワークフロー再実行 |
| Draft PR 作成失敗 | GITHUB_TOKEN 権限不足 | リポジトリ設定で Actions 権限確認 |
| ログにシークレット表示 | シークレットフィルタ漏れ | `.github/workflows/copilot-analyze-trace.yml` の SECRET_PATTERNS を確認・拡張 |

### 使用例

#### ステップ 1: Playwright テストを実行

```bash
# ローカルまたは CI で
npm run test:e2e
```

テスト失敗後、自動的に trace artifact が生成される。

#### ステップ 2: ワークフローを手動トリガー

GitHub UI → Actions → **copilot-analyze-trace** → Run workflow

入力例:
- `artifact_name`: `playwright-report`
- `artifact_id`: （空 or オプション）

#### ステップ 3: Draft PR を確認

ワークフロー完了後、リポジトリに Draft PR が作成される。

PR 本文に以下が含まれる:
- 失敗原因の短い要約
- Copilot による修正案 3 案
- 各案の検証手順

#### ステップ 4: 修正案を検討・実装

各修正案の「リスク」と「検証手順」を確認してから対応。

#### ステップ 5: 人間レビュー→マージ

Draft チェックボックスを外して通常 PR に変更 → チームレビュー → 手動マージ

### よくある質問（FAQ）

**Q: なぜ自動マージしないの？**
A: Copilot が生成する修正案はあくまで提案であり、実装のリスク評価と最終判断は人間が行うべきです。

**Q: Draft PR を自動でマージしたい場合は？**
A: 安定性を十分検証後、別途カスタマイズして `gh pr merge --auto` を追加可能です。現在は PoC のため、人間ゲートを必須としています。

**Q: PR トリガーではなく手動トリガーなの？**
A: 初期 PoC 段階のため、開発チームが安全に検証してから本番化する想定です。安定後に Phase 2 として PR トリガーに拡張予定。

**Q: 修正案が多い場合は？**
A: 現在は最大 3 案に限定。より詳細な提案が必要な場合は、Copilot プロンプトをカスタマイズ可能。

**Q: Slack に通知してほしい**
A: Phase 2 で拡張予定。現在は Draft PR 作成通知のみ。

### 参考資料

- [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [GitHub Actions Artifacts](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)
- [GitHub API: Create PR](https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#create-a-pull-request)
- Skill: `.github/skills/10-playwright-trace-analysis.md`

### 今後の拡張（Phase 2+）

1. **PR トリガー版**: Playwright trace が含まれる PR を自動検出・分析
2. **修正コード生成**: Copilot が修正を別ブランチに自動コミット
3. **チーム通知**: Slack / Teams への失敗情報通知
4. **パフォーマンス分析**: タイムアウト原因のネットワーク / UI レンダリング分類

---

## Files Reference

| File | Purpose | Trigger |
|------|---------|---------|
| `.github/workflows/test-coverage-analysis.yml` | Coverage gap analysis | push (main), PR |
| `.github/workflows/auto-code-review.yml` | Linting + test impact review | PR (open/sync/reopen/ready) |
| `.github/workflows/test-matrix.yml` | Parallel test execution | push (main/develop), PR |
| `.github/workflows/quality-report-pr.yml` | Aggregate results → PR comment | workflow_run (test-matrix) |
| `.github/workflows/quality-schedule.yml` | Weekly comprehensive check | schedule (Fri 5:00 AM JST) |
| `.github/workflows/copilot-analyze-trace.yml` | Playwright trace analysis + Copilot suggestions | workflow_dispatch (manual) |

## Environment Variables & Secrets

No additional secrets required. Uses:
- `${{ secrets.GITHUB_TOKEN }}`: Default GitHub token (always available)
- `${{ github.token }}`: Same as above in some contexts

## Future Enhancements

1. **Cache npm dependencies** across matrix jobs
2. **Parallel artifact uploads** instead of sequential
3. **Custom threshold configuration** for gap scores
4. **Slack notifications** on scheduled failures
5. **Historical trend analysis** dashboard
6. **Test flakiness detection** across matrix runs
7. **Playwright trace analysis** PR trigger expansion (Phase 2)
8. **Auto-fix suggestions** integration with code generation (Phase 2+)
