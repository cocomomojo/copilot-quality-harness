# Issue単位 品質レポート生成ガイド

このドキュメントは、Issue ごとの品質レポートをダッシュボードに追加するための手順を説明します。

## 概要

`spec-to-implementation` ワークフロー実行後、以下の流れで品質レポートが生成・表示されます：

```
Issue 作成
  ↓
spec-to-implementation ワークフロー実行
  ├─ Spec YML 生成
  ├─ 実装コード生成
  └─ PR 作成
  ↓
Test Matrix ワークフロー実行（PR の CI）
  ├─ UT 実行（backend）
  ├─ E2E 実行（frontend）
  └─ Coverage 収集
  ↓
Quality Report 生成（手動または自動）
  ├─ issue-reports.json 更新
  ├─ 詳細ページ生成
  └─ ダッシュボード更新
```

## 手動による品質レポート生成手順

### ステップ 1: テスト実行

Issue に対応する PR をマージ後、テストを実行：

```bash
npm test
```

### ステップ 2: テストデータ収集

テスト実行後、coverage データが以下に生成されます：

- `backend/coverage/coverage-final.json` - Backend coverage
- `frontend/coverage/coverage-summary.json` - Frontend coverage

### ステップ 3: レポートデータ生成

Issue #XX のレポートデータを作成し、issue-reports.json に追加します。

レポートデータ構造は以下を参照してください：[issue-reports.json](docs/dashboard/data/issue-reports.json)

主要フィールド：
- `issue_number`: Issue 番号
- `pr_number`: 対応する PR 番号
- `pass_rate`: テスト合格率 (0-100)
- `total_tests`: 総テスト数
- `coverage.overall`: 全体カバレッジ
- `coverage.files[]`: ファイル単位のカバレッジ
- `traceability.ut_details[]`: UT 詳細（テストファイル、テスト数、合格率）
- `traceability.e2e_details[]`: E2E 詳細（テストファイル、テスト数、合格率）

### ステップ 4: ダッシュボード生成

レポートデータを `qa/dashboard-data/` にコピー：

```bash
cp docs/dashboard/data/issue-reports.json qa/dashboard-data/issue-reports.json
```

ダッシュボード生成スクリプト実行：

```bash
npm run generate:dashboard
npm run generate:e2e-details
node scripts/generate-quality-report-details.mjs
```

### ステップ 5: Git にコミット

```bash
git add -A
git commit -m "docs: Add Issue #XX quality report to dashboard

- Coverage: XX% lines, XX% branches
- Test Results: NN/NN passed
- UT Details: XX tests
- E2E Details: XX tests"
git push origin main
```

## ダッシュボード表示確認

以下 URL でダッシュボードを確認：

- **メイン**: `docs/dashboard/index.html` - Issue 一覧表示
- **詳細**: `docs/dashboard/details/issue-XX-report.html` - Issue #XX の詳細レポート

## ダッシュボード表示内容

### メインダッシュボード（index.html）

- Issue 一覧テーブル
- Issue ごとの Pass Rate
- 最新 KPI 情報

### 詳細レポートページ（issue-XX-report.html）

表示される情報：

1. **カバレッジ詳細**
   - 全体：Lines%, Branches%, Functions%
   - ファイル単位のカバレッジ（Pass/Fail ステータス付き）

2. **ユニットテスト詳細**
   - テストファイル別の合格数/不合格数/合格率
   - 表形式で表示

3. **E2E テスト詳細**
   - テストファイル別の合格数/不合格数/合格率
   - 表形式で表示

4. **テスト観点**（オプション）
   - 機能適合性、性能効率、互換性など 8 つの特性
   - テスト観点の詳細

5. **テスト項目**（オプション）
   - ISO 25010 品質特性に基づいた詳細テスト項目
   - ID、観点、説明を記載

6. **仕様ファイル**
   - 対応する spec YML ファイルへのリンク

## データ構造

### issue-reports.json スキーマ

```json
{
  "generated_at": "ISO 8601 timestamp",
  "reports": [
    {
      "issue_number": N,
      "pr_number": N,
      "workflow_run_id": null,
      "generated_at": "ISO 8601 timestamp",
      "pass_rate": N (0-100),
      "total_tests": N,
      "total_passed": N,
      "total_failed": N,
      "coverage": {
        "overall": {
          "lines_pct": N,
          "branches_pct": N,
          "functions_pct": N,
          "status": "pass|fail"
        },
        "files": [
          {
            "path": "string",
            "lines_pct": N,
            "branches_pct": N,
            "functions_pct": N,
            "status": "pass|fail"
          }
        ],
        "non_pass_count": N,
        "thresholds": {
          "lines": 80,
          "branches": 75,
          "functions": 80
        }
      },
      "traceability": {
        "perspective_count": N,
        "quality_items_count": N,
        "perspectives_file": "path/to/perspectives.json",
        "test_items_file": "path/to/test-items.json",
        "spec_files": [
          {
            "path": "tests/specs/example.yml",
            "feature": "Feature description"
          }
        ],
        "ut_cases": N,
        "e2e_cases": N,
        "ut_details": [
          {
            "test_file": "backend/src/app.test.js",
            "test_count": N,
            "passed": N,
            "failed": N,
            "pass_rate": N
          }
        ],
        "e2e_details": [
          {
            "test_file": "frontend/src/App.test.jsx",
            "test_count": N,
            "passed": N,
            "failed": N,
            "pass_rate": N
          }
        ]
      },
      "implementation_files": [
        "string"
      ]
    }
  ]
}
```

## 関連スクリプト

- [scripts/generate-dashboard.mjs](/scripts/generate-dashboard.mjs) - メインダッシュボード生成
- [scripts/generate-quality-report-details.mjs](/scripts/generate-quality-report-details.mjs) - 詳細ページ生成
- [scripts/generate-e2e-details.mjs](/scripts/generate-e2e-details.mjs) - E2E 詳細ページ生成

## 自動化の今後

現在、品質レポート生成は手動ですが、将来的に以下の自動化を検討：

- [ ] Test Matrix ワークフロー完了後、自動的に quality-report を生成
- [ ] spec-to-implementation ワークフロー内に品質レポート更新ステップを統合
- [ ] GitHub Actions で自動的に issue-reports.json を更新・ダッシュボード再生成
- [ ] workflow_run_id を自動キャプチャ

## トラブルシューティング

### ダッシュボードに Issue が表示されない

1. `qa/dashboard-data/issue-reports.json` が存在するか確認
2. `docs/dashboard/data/issue-reports.json` が最新か確認
3. `npm run generate:dashboard` を実行して再生成

### 詳細ページが生成されない

1. `docs/dashboard/data/issue-reports.json` にデータがあるか確認
2. `node scripts/generate-quality-report-details.mjs` を実行
3. `docs/dashboard/details/` ディレクトリに HTML ファイルが生成されたか確認

### テスト詳細が表示されない

1. `traceability.ut_details[]` と `traceability.e2e_details[]` にデータがあるか確認
2. 各要素に `test_file`, `test_count`, `passed`, `failed`, `pass_rate` フィールドがあるか確認
3. `node scripts/generate-quality-report-details.mjs` を再実行

