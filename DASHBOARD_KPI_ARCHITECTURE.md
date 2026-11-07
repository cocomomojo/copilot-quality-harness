# ダッシュボード KPI アーキテクチャ

## 概要

品質ダッシュボード（https://cocomomojo.github.io/copilot-quality-harness/）の KPI データは、2つの異なるソースから生成されます：

### 1. **全体 KPI（システム全体の品質指標）**

**ソース**: `test-matrix.yml` ワークフロー実行結果

**データファイル**:
- `docs/dashboard/data/latest-kpi.json` - 最新の全体KPI
- `docs/dashboard/data/kpi-history.json` - 全体KPIの履歴（90日間）

**内容**:
| 指標 | 説明 | 例 |
|------|------|-----|
| `test_count` | システムテスト総数 | 9 (unit+api+e2e+advanced) |
| `pass_rate` | 全体の合格率 | 100% |
| `passed` | 合格テスト数 | 9 |
| `failed` | 失敗テスト数 | 0 |
| `coverage` | コードカバレッジ | 59% |
| `ai_danger_rank` | AI危険度ランク | D |
| `data_source` | データソース | TEST_MATRIX_ARTIFACT |

**収集フロー**:
```
test-matrix.yml (workflow)
  ↓
test-matrix-summary.json (artifact)
  ↓
collect-kpi-advanced.mjs
  ↓
latest-kpi.json / kpi-history.json
  ↓
Dashboard UI
```

### 2. **Issue 単位の品質レポート**

**ソース**: 各 Issue の PR テスト結果（quality-report-pr.yml）

**データファイル**:
- `qa/dashboard-data/issue-reports.json` - Issue 毎のレポート集
- `docs/dashboard/data/issue-reports.json` - ダッシュボード用（コピー）

**内容**: 各 Issue ごとに以下を記録
| フィールド | 説明 | 例 |
|-----------|------|-----|
| `issue_number` | Issue番号 | 63 |
| `total_tests` | その Issue のテスト数 | 3 |
| `pass_rate` | その Issue の合格率 | 100% |
| `coverage` | その Issue の行カバレッジ | 100% |
| `traceability` | テスト-要件トレーサビリティ | 詳細 |
| `implementation_files` | 修正ファイル | Footer.jsx など |

**収集フロー**:
```
Issue #63 作成
  ↓
PR #XX で実装
  ↓
quality-report-pr.yml
  ↓
generate-quality-report-details.mjs
  ↓
issue-reports.json
  ↓
Dashboard に「Issue単位 品質レポート」セクション表示
```

---

## ダッシュボード表示

### トップの「品質ダッシュボード」セクション

**表示データ**: `latest-kpi.json` の全体KPI
- テスト数: 9（すべてのテスト実行）
- 合格率: 100%
- カバレッジ: 59%
- AI危険度: Rank D

### 下段の「Issue単位 品質レポート」セクション

**表示データ**: `issue-reports.json` の各Issue
- Issue #44: 44テスト、100%合格
- Issue #56: 103テスト、100%合格
- Issue #63: 3テスト、100%合格

---

## 重要: 分離の意味

```
┌─────────────────────────────────────────────────────────┐
│ 全体 KPI (システム全体の品質状態)                        │
│ - test-matrix.yml による実テスト実行                    │
│ - 本番環境での動作を示す                              │
│ - 毎回の test-matrix 完了時に更新                    │
├─────────────────────────────────────────────────────────┤
│ Issue単位 品質レポート (個別機能の品質記録)             │
│ - 各 Issue/PR ごとの実装テスト結果                    │
│ - 履歴として保持（削除されない）                      │
│ - Issue クローズ時に生成                             │
└─────────────────────────────────────────────────────────┘
```

**なぜ分離するのか?**:
- 全体 KPI は「今この瞬間のシステム品質」
- Issue 単位は「過去の実装品質の記録」
- 混在すると、修正の度にデータが上書きされてしまう

---

## よくある問題と対処

### 問題: 全体KPI の test_count が異常に小さい（例: 5）

**原因**: GitHub API fallback が使用された
- test-matrix-summary.json が生成されていない
- GitHub workflow の job count を test count と誤認識

**対処**:
1. test-matrix.yml のログを確認
2. 各テストタイプ（unit, api, e2e, advanced）が完了したか確認
3. test-matrix-summary.json artifact が生成されたか確認

**collect-kpi-advanced.mjs の修正**: 
- GitHub API fallback は now return null（禁止）
- test-matrix-summary.json が必須

### 問題: カバレッジが 0% から急に上昇する

**原因**: coverage data source の切り替わり

**正常な挙動**:
- ローカル coverage file がない
  ↓
- 前回の workflow artifact から restore
  ↓
- 新しい coverage data で上書き

**対処**: coverage artifact が正しく生成・アップロードされているか確認

### 問題: Issue #XX のレポートがダッシュボードに表示されない

**確認**:
1. `qa/dashboard-data/issue-reports.json` に Issue が存在するか
2. `docs/dashboard/data/issue-reports.json` にコピーされたか
3. ダッシュボード HTML が `issue-reports.json` を fetch できるか

**追加方法**: Issue 実装後、以下を実行
```bash
# テスト実行して issue-reports.json に追加
node scripts/generate-quality-report-details.mjs

# ダッシュボード用にコピー
cp qa/dashboard-data/issue-reports.json docs/dashboard/data/issue-reports.json

# git に commit
git add docs/dashboard/data/issue-reports.json
git commit -m "feat: Add Issue #XX report to dashboard"
```

---

## KPI 計算式

### 全体 KPI

```
Pass Rate = (passed_tests / total_tests) × 100%
Composite Score = (Pass Rate × 0.4) + (Coverage × 0.3) + (Test Count Health × 0.3)
AI Danger Rank = {
  A: 90 ≤ score (SAFE)
  B: 75 ≤ score < 90 (LOW RISK)
  C: 50 ≤ score < 75 (MEDIUM RISK)
  D: 25 ≤ score < 50 (HIGH RISK)
  E: score < 25 (CRITICAL)
}
```

### Issue 単位の KPI

```
各 Issue の Pass Rate = (その Issue で合格したテスト数 / その Issue のテスト総数) × 100%
カバレッジ = その Issue 実装コードの行カバレッジ
```

---

## 更新スケジュール

| データ | 更新タイミング | ファイル |
|--------|-------------|--------|
| 全体KPI | test-matrix.yml 完了時 | latest-kpi.json |
| KPI履歴 | 毎回の全体KPI更新時 | kpi-history.json |
| Issue単位 | quality-report-pr.yml 完了時 | issue-reports.json |
| ダッシュボード HTML | update-dashboard.yml 完了時 | docs/dashboard/ |

---

## 関連スクリプト

- `scripts/collect-kpi-advanced.mjs` - 全体KPI収集
- `scripts/generate-quality-report-details.mjs` - Issue単位レポート生成
- `scripts/generate-dashboard.mjs` - ダッシュボード HTML 生成
- `.github/workflows/test-matrix.yml` - テスト実行
- `.github/workflows/update-dashboard.yml` - ダッシュボード更新オーケストレーション
- `.github/workflows/quality-report-pr.yml` - Issue単位レポート生成

---

## バージョン履歴

**2026-11-07**:
- Issue #63 報告時に GitHub API fallback 問題を発見
- test_count=5 （job count ≠ test count）の誤り修正
- GitHub API fallback を禁止（return null）
- このドキュメント作成
