# 品質特性ベースのテスト観点・項目シート自動生成 + 品質ダッシュボード実装ガイド

## 📋 実装概要

このドキュメントは、Copilot Quality Harness に「品質特性ベースのテスト観点・項目シート自動生成」と「品質ダッシュボード」機能を統合するための実装ガイドです。

## 🎯 実装された機能

### Phase 1: 品質特性ベースのテスト観点・項目生成 ✅

**目的**: ISO/IEC 25010 品質特性に基づいて、体系的にテスト観点と項目を自動生成

#### 成果物

1. **ISO/IEC 25010 定義ファイル**
   - ファイル: `qa/quality-characteristics/iso25010-definition.yml`
   - 内容: 8つの品質特性、副特性、テスト観点マッピング

2. **テスト項目生成スクリプト**
   - ファイル: `scripts/generate-quality-characteristics.ts`
   - 機能: 簡易/詳細モードでテスト項目を自動生成
   - 出力: JSON, YAML形式のテスト観点・項目集

3. **ドキュメント**
   - ファイル: `qa/quality-characteristics/README.md`
   - 内容: 使用方法、カスタマイズガイド

### Phase 2: 品質ダッシュボード ✅

**目的**: テスト結果、KPI、AI危険度ランク、テスト合格率推移を可視化

#### 成果物

1. **ダッシュボード生成スクリプト**
   - ファイル: `scripts/generate-dashboard.ts`
   - 機能: インタラクティブなHTML5ダッシュボードを生成
   - 特徴:
     - リアルタイム品質指標表示
     - Chart.js による30日間トレンドグラフ
     - ISO/IEC 25010 品質特性別テスト状況
     - AI危険度ランク（A～E）表示
     - レスポンシブデザイン

2. **ダッシュボード HTML**
   - ファイル: `docs/dashboard/index.html` (自動生成)
   - GitHub Pages へ自動デプロイ
   - URL: `https://cocomomojo.github.io/copilot-quality-harness/dashboard/`

3. **ドキュメント**
   - ファイル: `docs/DASHBOARD.md`
   - 内容: ダッシュボード機能説明、使用方法

### Phase 3: CI/CD ワークフロー統合 ✅

#### ワークフロー 1: generate-quality-items.yml

**目的**: テスト項目を手動で生成し、PR として作成

```
Manual Trigger (workflow_dispatch)
    ↓ mode: simple | detailed
    ↓
Generate Quality Characteristics
    ↓
Create Branch & Commit
    ↓
Create Pull Request
    ↓
Upload Artifacts
```

**実行方法**:
```
GitHub → Actions → "Generate Quality Items" → Run workflow → Select mode → Run
```

**出力**:
- PR (test-perspectives, test-items を含む)
- アーティファクト (30日間保持)

#### ワークフロー 2: update-dashboard.yml

**目的**: 毎日ダッシュボードを更新し、GitHub Pages にデプロイ

```
Trigger:
  1. スケジュール (毎日 AM 10:00 JST)
  2. quality-schedule.yml 完了時
  3. Manual (workflow_dispatch)
    ↓
Collect KPI Data
    ↓
Generate Dashboard HTML
    ↓
Deploy to GitHub Pages
    ↓
Create/Update Summary Issue
```

**出力**:
- GitHub Pages へのデプロイ
- KPI 履歴の蓄積（最大90日）
- 自動 Issue 作成/更新

## 📦 ファイル構成

```
.
├── .github/
│   └── workflows/
│       ├── generate-quality-items.yml      [NEW] テスト項目生成
│       └── update-dashboard.yml            [NEW] ダッシュボード更新
├── docs/
│   ├── DASHBOARD.md                        [NEW] ダッシュボード説明
│   └── dashboard/                          [NEW] GitHub Pages コンテンツ
│       ├── index.html                      (自動生成)
│       └── data/
│           └── latest-kpi.json             (自動生成)
├── qa/
│   ├── quality-characteristics/            [NEW] 品質特性
│   │   ├── iso25010-definition.yml         [NEW] 定義ファイル
│   │   ├── README.md                       [NEW] ドキュメント
│   │   └── generated/                      (自動生成)
│   │       ├── test-perspectives-*.json
│   │       ├── test-items-*.yml
│   │       └── test-items-*.json
│   └── dashboard-data/                     [NEW] KPI データ
│       ├── latest-kpi.json                 (自動生成)
│       └── kpi-history.json                (自動生成)
├── scripts/
│   ├── generate-quality-characteristics.ts [NEW] テスト項目生成
│   └── generate-dashboard.ts               [NEW] ダッシュボード生成
└── package.json                            [UPDATED] yaml 追加
```

## 🚀 使用方法

### 1. テスト項目の生成

**簡易モード** (5～10項目/特性):

```bash
npm run generate:quality-items -- simple
```

**詳細モード** (15～25項目/特性):

```bash
npm run generate:quality-items -- detailed
```

**GitHub Actions 経由**:
1. Actions → "Generate Quality Items"
2. "Run workflow" をクリック
3. Mode を選択 (simple/detailed)
4. "Run workflow" をクリック
→ テスト項目が生成され、PR が作成されます

### 2. ダッシュボードの生成（ローカル）

```bash
npm run generate:dashboard -- qa/dashboard-data docs/dashboard "Quality Dashboard"
```

出力: `docs/dashboard/index.html`

### 3. ダッシュボードの確認

**GitHub Pages**:
```
https://cocomomojo.github.io/copilot-quality-harness/dashboard/
```

**ローカル確認**:
```bash
# docs/dashboard/index.html をブラウザで開く
```

## 🔄 CI/CD パイプライン統合

### 既存ワークフローとの連携

```
quality-schedule.yml (毎週金曜 AM 5:00)
    ↓
テスト実行
    ↓
KPI 収集
    ↓
update-dashboard.yml (毎日 AM 10:00)
    ↓
ダッシュボード生成 & デプロイ
    ↓
GitHub Pages 更新
    ↓
Summary Issue 自動作成
```

### 自動実行スケジュール

| ワークフロー | スケジュール | トリガー |
|-------------|-------------|---------|
| quality-schedule | 毎週金曜 AM 5:00 JST | cron |
| update-dashboard | 毎日 AM 10:00 JST | cron + quality-schedule 完了 |

## 📊 データフロー

```
Test Execution
    ↓
quality-schedule.yml
    ├─ unit tests
    ├─ api tests
    ├─ e2e tests
    └─ advanced tests
    ↓
KPI Calculation
    ├─ pass_rate
    ├─ test_count
    ├─ coverage
    └─ ai_danger_rank
    ↓
update-dashboard.yml
    ├─ Collect KPI
    ├─ Update history (90日保持)
    ├─ Generate HTML
    └─ Deploy to GitHub Pages
    ↓
Quality Dashboard
    ├─ Real-time metrics
    ├─ Trend graphs (30日)
    ├─ AI danger rank
    └─ Characteristics status
```

## 🎯 主要な指標

### テスト合格率 (Pass Rate)

```
pass_rate = (passed_tests / total_tests) * 100
```

- 目標: 90% 以上
- アラート: 80% 以下

### コードカバレッジ (Code Coverage)

```
coverage = (covered_lines / total_lines) * 100
```

- 目標: 80% 以上
- アラート: 70% 以下

### AI 危険度ランク (AI Danger Rank)

```
rank = f(pass_rate, coverage, issue_severity, security_alerts)

A (Safe):        pass_rate >= 95% AND coverage >= 85%
B (Acceptable):  pass_rate >= 90% AND coverage >= 80%
C (Warning):     pass_rate >= 85% AND coverage >= 75%
D (Risky):       pass_rate >= 80% AND coverage >= 70%
E (Critical):    pass_rate < 80% OR coverage < 70%
```

## 🔧 カスタマイズガイド

### 1. テスト項目を追加

`scripts/generate-quality-characteristics.ts` の `testItemTemplates` を編集：

```typescript
'your-characteristic-id': [
  {
    id: 'YOUR-001',
    characteristic_id: 'your-characteristic-id',
    perspective: 'your-test-perspective',
    description: 'テストの説明',
    test_condition: 'テスト条件',
    expected_result: '期待値',
    acceptance_criteria: '受け入れ基準'
  }
]
```

### 2. ダッシュボード UI をカスタマイズ

`scripts/generate-dashboard.ts` の HTML/CSS を編集：

```typescript
const dashboardHTML = `
  <style>
    /* カスタム CSS */
    body { background: #your-color; }
    .summary-card { /* カスタム */  }
  </style>
`
```

### 3. AI 危険度ランク計算をカスタマイズ

`scripts/generate-dashboard.ts` の `callCopilotAPI()` 関数を編集：

```typescript
if (passRate < 85 || coverage < 75) aiDangerRank = 'E';
// ロジックをカスタマイズ
```

## 📚 参考資料

- [ISO/IEC 25010 Product Quality Model](https://www.iso.org/standard/35733.html)
- [品質特性ドキュメント](../qa/quality-characteristics/README.md)
- [ダッシュボードドキュメント](../docs/DASHBOARD.md)
- [テスト管理ガイド](../qa/test-management/)

## 🔍 トラブルシューティング

### Q: テスト項目生成が失敗する

**A: yaml パッケージがインストールされているか確認**

```bash
npm install
npm list yaml
```

### Q: ダッシュボードが表示されない

**A: ローカルで確認**

```bash
npm run generate:dashboard -- qa/dashboard-data docs/dashboard
# docs/dashboard/index.html をブラウザで開く
```

### Q: GitHub Pages に反映されない

**A: リポジトリ設定を確認**

1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: main, folder: /docs

### Q: KPI データが更新されない

**A: ワークフロー実行ログを確認**

```bash
gh run list --workflow update-dashboard.yml --limit 5
gh run view <run_id> --log
```

## 📈 今後の拡張

### Phase 4 計画

1. **テスト項目の自動マッピング**
   - テスト結果と品質特性の自動マッピング

2. **Issue 統合**
   - Issue ごとにテスト観点・項目を管理

3. **KPI グラフ**
   - より詳細なトレンド分析
   - カスタマイズ可能なメトリクス

4. **データ エクスポート**
   - CSV, Excel フォーマットでのエクスポート

5. **通知機能**
   - AI危険度ランク低下時の自動通知
   - Slack, Teams への統合

## ✅ チェックリスト

実装完了時の確認事項：

- [x] ISO/IEC 25010 定義ファイルが作成されているか
- [x] テスト項目生成スクリプトが動作するか
- [x] ダッシュボード生成スクリプトが動作するか
- [x] generate-quality-items.yml ワークフローが設定されているか
- [x] update-dashboard.yml ワークフローが設定されているか
- [x] yaml パッケージが package.json に追加されているか
- [ ] npm install が実行できるか (環境確認)
- [ ] GitHub Pages が有効になっているか (リポジトリ設定確認)
- [ ] docs/ ディレクトリが GitHub Pages で公開されているか確認

## 📞 サポート

質問や問題がある場合：

1. [GitHub Issues](../../issues) で報告
2. [PR を作成](../../pulls) してコントリビューション
3. ドキュメントの改善提案

---

**実装日**: 2026-10-19
**バージョン**: 1.0.0
**対応ブランチ**: main
**最終更新**: 2026-10-19
