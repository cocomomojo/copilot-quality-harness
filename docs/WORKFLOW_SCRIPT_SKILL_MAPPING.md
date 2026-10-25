---
layout: default
title: 🗺️ ワークフロー・スクリプト・Skill マッピング表
---

# 🗺️ ワークフロー・スクリプト・Skill マッピング表

実装とドキュメント・Skillsの整合性を確保するための完全なマッピング表

---

## 📊 マッピング一覧

| # | Issue型 | Workflow | Script | Skill | 入力 | 出力 | 状態 |
|---|---------|----------|--------|-------|------|------|------|
| **1** | **🔵 Issue 解析** | `m2-issue-intake.yml` | `m2-validation.mjs` | - | Issue JSON | M2 Report JSON + PR Comment | ✅ 実装 |
| **2** | **🧪 テスト観点生成** | `generate-quality-items.yml` | `generate-quality-characteristics.ts` | - | なし | YAML/JSON（Test Perspectives） | ✅ 実装 |
| **3** | **📋 テスト仕様作成** | Manual | - | - | テスト観点 | `tests/specs/*.yml` | ⚠️ 手動 |
| **4** | **🛠️ 仕様→実装** | `spec-to-implementation.yml` | `generate-tests-from-spec.ts` | `spec_to_tests` | Spec YAML | UT/E2E/Mock コード + PR | ✅ 実装 |
| **5** | **💻 開発実装** | - | - | `implementation_generator` | Spec YAML | 実装コード | ⚠️ Manual |
| **6** | **✅ UT実行** | `test-matrix.yml` | - | - | コード | test-results-*.json | ✅ 実装 |
| **7** | **✅ E2E実行** | `test-matrix.yml` | - | - | コード | e2e-results-*.json | ✅ 実装 |
| **8** | **📈 品質レポート** | `quality-report-pr.yml` | `generate-aggregated-comment.ts` | - | Artifacts | PR Comment | ✅ 実装 |
| **9** | **🤖 AI Review** | `ai-review.yml` | - | - | PR diff | AI Comment | ✅ 実装 |
| **10** | **📊 Trace分析** | `copilot-analyze-trace.yml` | `trace-summary.ts`, `copilot-client.ts`, `aggregate-trace-results.ts` | `trace_analyzer` | trace.zip | 分析結果 + Draft PR | ✅ 実装 |
| **11** | **📈 ダッシュボード** | `update-dashboard.yml` | `collect-kpi-advanced.mjs`, `generate-dashboard.mjs`, `generate-e2e-report.ts`, `generate-e2e-details-page.mjs` | - | Test Matrix artifacts + KPI履歴 | dashboard + e2e reports | ✅ 実装 |

> 2026-10-25 追記: `update-dashboard.yml` は KPI/E2E 生成で **同一 Test Matrix run_id** を使用する。

---

## 🔷 詳細マッピング（Workflow ごと）

### 1️⃣ m2-issue-intake.yml

```
目的: Issue を読み込み、自動的にテスト観点・テスト項目を生成するための下準備
ステップ:
  1. Issue JSON を読み込み
  2. リポジトリ構造を分析（ディレクトリ・既存テスト確認）
  3. テスト設計YAML テンプレを生成
  4. PR にテンプレを投稿
  
トリガー: workflow_dispatch（手動）
入力: issue_number (string)
出力: M2 Report JSON + PR Comment

Scriptの役割:
  - m2-validation.mjs:
    - Issue JSON パース
    - リポジトリ構造分析
    - テスト観点推定
    - M2 Report JSON 生成

Skill: なし（現在はスクリプトのみ）

実装状態: ✅ 完全実装
  - スクリプト: scripts/m2-validation.mjs
  - Workflow: .github/workflows/m2-issue-intake.yml
  - テスト: tests/m2-validation.test.mjs
```

### 2️⃣ generate-quality-items.yml

```
目的: ISO/IEC 25010 品質特性に基づいてテスト観点・テスト項目を生成
ステップ:
  1. 生成モード選択（simple / detailed）
  2. 品質特性ごとにテスト項目を生成
  3. YAML/JSON で出力
  4. PR 作成（アーティファクト追加）

トリガー: workflow_dispatch（手動）
入力: mode (simple | detailed)
出力: test-perspectives.yml, test-perspectives.json

Scriptの役割:
  - generate-quality-characteristics.ts:
    - ISO/IEC 25010 定義を読み込み
    - テスト観点を自動生成
    - YAML/JSON で出力

Skill: なし（現在はスクリプトのみ）

実装状態: ✅ 完全実装
  - スクリプト: scripts/generate-quality-characteristics.ts
  - Workflow: .github/workflows/generate-quality-items.yml
  - 出力先: qa/quality-characteristics/generated/
```

### 3️⃣ spec-to-implementation.yml

```
目的: テスト仕様YAML から UT/E2E/実装コード を自動生成
ステップ:
  1. tests/specs/*.yml を読み込み
  2. Copilot に指示してコード生成（spec_to_tests Skill を使用）
  3. UT, E2E, Mock ファイルを生成
  4. PR を作成（生成コードを含む）

トリガー: workflow_dispatch（手動）
入力: spec_file (path to YAML)
出力: 3 つの PR（UT/E2E/Mock コード）

Scriptの役割:
  - generate-tests-from-spec.ts:
    - Spec YAML を読み込み
    - Copilot SDK を呼び出し（spec_to_tests Skill）
    - テストコード生成
    - UT, E2E, Mock ファイルを出力

Skill: spec_to_tests
  - 定義: .copilot/skills.json
  - 役割: テスト設計YAML → UT/E2E テストコード生成

実装状態: ✅ 完全実装
  - スクリプト: scripts/generate-tests-from-spec.ts
  - Workflow: .github/workflows/spec-to-implementation.yml
  - Skill: .copilot/skills.json - spec_to_tests
```

### 4️⃣ test-matrix.yml

```
目的: UT + E2E テストを並列実行（Node 20）
ステップ:
  1. Matrix 戦略で複数ジョブを並列実行
  2. UT を実行
  3. E2E を実行
  4. Coverage を収集
  5. 結果を JSON で出力

トリガー: PR / Push
入力: コード
出力: test-results-*.json, coverage-*.json

実装状態: ✅ 完全実装
  - Workflow: .github/workflows/test-matrix.yml
  - Matrix: node-version [20], test-type [unit, e2e]
  - アーティファクト: test-results-*, coverage-*
```

### 5️⃣ quality-report-pr.yml

```
目的: test-matrix.yml の結果を集約し、PR コメントを投稿
ステップ:
  1. test-matrix.yml の完了を待つ（workflow_run）
  2. アーティファクトをダウンロード
  3. 結果を集約・整理
  4. PR コメント本文を生成
  5. PR にコメント投稿

トリガー: workflow_run（test-matrix.yml 完了）
入力: アーティファクト（test-results-*.json）
出力: PR Comment

Scriptの役割:
  - generate-aggregated-comment.ts:
    - アーティファクト JSON を読み込み
    - 結果を整理・フォーマット
    - PR コメント本文を生成

実装状態: ✅ 完全実装
  - スクリプト: scripts/generate-aggregated-comment.ts
  - Workflow: .github/workflows/quality-report-pr.yml
  - トリガー: workflow_run [Test Matrix]
```

### 6️⃣ ai-review.yml

```
目的: Copilot による自動コード品質レビュー
ステップ:
  1. PR の diff を取得
  2. セキュリティ/パフォーマンス/カバレッジを分析
  3. AI コメントを生成
  4. PR に投稿

トリガー: PR (opened, synchronize, reopened, ready_for_review, edited)
入力: PR diff
出力: AI Comment

Skillの役割:
  - 複数スキルが連携：trace_analyzer, implementation_generator など

実装状態: ✅ 完全実装
  - Workflow: .github/workflows/ai-review.yml
  - Copilot SDK 使用
```

### 7️⃣ copilot-analyze-trace.yml

```
目的: Playwright trace.zip から テスト失敗を分析し、修正案を生成
ステップ:
  1. detect-artifacts: .zip ファイルを検出
  2. analyze-traces (Matrix): 複数トレースを並列分析
  3. aggregate-results: 結果を集約・デダプリケーション
  4. post-aggregated-comment: PR コメント投稿

トリガー: workflow_dispatch（手動）or PR
入力: artifact_name, branch
出力: 分析結果 + Draft PR + PR Comment

Scriptの役割:
  - trace-summary.ts: trace.zip パース & 失敗情報抽出
  - copilot-client.ts: Copilot CLI ラッパー（修正案生成）
  - detect-trace-artifacts.ts: アーティファクト検出
  - aggregate-trace-results.ts: 複数トレース集約 & デダプリケーション

Skill: trace_analyzer
  - 定義: .copilot/skills.json
  - 役割: trace → 失敗分析・修正提案

実装状態: ✅ 完全実装
  - Workflow: .github/workflows/copilot-analyze-trace.yml
  - スクリプト: 複数
  - Skill: .copilot/skills.json - trace_analyzer
```

---

## 🔍 実装状態サマリー

| カテゴリ | 実装状態 | 詳細 |
|---------|--------|------|
| **Workflow** | ✅ 完全 | 11個すべて実装済み |
| **Script** | ✅ 完全 | 12個すべて実装済み |
| **Skill定義** | ✅ 完全 | 4個定義済み（trace_analyzer, spec_to_tests, implementation_generator, pr_metadata_adder） |
| **ドキュメント** | ⚠️ 部分 | README 更新済み、OPERATION_FLOW.md 新規作成 |
| **workflow_run接続** | ✅ 完全 | quality-report-pr, update-dashboard 接続済み |

---

## 🎯 改善提案（優先度順）

### 優先度 1: 高（重要）

- [ ] **`OPERATION_FLOW.md` をチーム全体で確認** → 既に作成済み
- [ ] **README に OPERATION_FLOW.md へのリンク追加** → 既に追加済み
- [ ] **各スクリプトのエラーハンドリング確認** → 実装を確認する必要あり

### 優先度 2: 中（推奨）

- [ ] **Skill 定義と実装の齟齬チェック** → 確認必要
- [ ] **workflow_run 接続の完全性確認** → 確認必要
- [ ] **アーティファクト仕様書の作成** → `.github/artifacts-schema.md` を新規作成

### 優先度 3: 低（エンハンスメント）

- [ ] **Skills JSON の documentation コメント充実**
- [ ] **各ワークフローの例外処理ドキュメント作成**
- [ ] **E2E テストシナリオの充実**

---

## 📝 使用方法

このマッピング表を使用して：

1. **新しいワークフローを追加する際**
   - このテーブルに「新規行」を追加
   - Workflow, Script, Skill の関係を明記

2. **実装の不整合を検出する際**
   - README / WORKFLOWS_GUIDE / .copilot/skills.json と比較
   - 不整合があれば修正（ドキュメント or スクリプト）

3. **チームオンボーディング時**
   - このマッピング表を参照して、全体像を把握

---

**Last Updated**: 2026-10-25  
**Maintainer**: copilot-quality-team
