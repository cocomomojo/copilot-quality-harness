# 品質ダッシュボード

リアルタイムで品質メトリクスとテスト結果を可視化するダッシュボードです。

## 📍 アクセス URL

```
https://cocomomojo.github.io/copilot-quality-harness/dashboard/
```

## 🎯 主な機能

### 1. リアルタイム品質指標

- **テスト合格率** - 直近のテスト実行における合格率
- **テスト実行数** - 実行されたテストの総数
- **コードカバレッジ** - ソースコードのテストカバレッジ率
- **AI危険度ランク** - Jev が算出した危険度（A～E）

### 2. トレンド分析

#### テスト合格率推移（30日間）
- 折れ線グラフで 30 日間の合格率の推移を表示
- 改善傾向の把握が可能

#### カバレッジ推移（30日間）
- コードカバレッジの 30 日間推移
- コード品質向上の進捗確認

### 3. 分布ダッシュボード

#### テスト結果分布
- 合格/不合格の円グラフ
- クイック確認が可能

#### AI危険度分布
- Issue 数の危険度別分布（A～E）
- リスク評価の視覚化

### 4. 詳細レポート

#### 最近のテスト実行結果テーブル
- 日時
- テスト数
- 合格/不合格数
- 合格率
- カバレッジ
- AI危険度ランク

#### ISO/IEC 25010 品質特性別テスト状況
- 品質特性ごとのテスト項目数
- 合格数と合格率
- 改善が必要な領域の特定

## 🚀 ダッシュボード生成

### 自動実行

**スケジュール**: 毎日 AM 10:00 JST

**トリガー**:
- 定時スケジュール実行
- `quality-schedule.yml` ワークフロー完了時

### 手動実行

GitHub Actions の `update-dashboard.yml` ワークフローを手動実行：

```bash
# Web UI から
1. Actions タブ
2. "Update Quality Dashboard" を選択
3. "Run workflow" をクリック
```

### ローカル実行

```bash
# ダッシュボード HTML を生成
npm run generate:dashboard -- qa/dashboard-data docs/dashboard "Quality Dashboard"

# 生成されたファイル
docs/dashboard/index.html
docs/dashboard/data/latest-kpi.json
```

## 📊 KPI データ構造

### Latest KPI (latest-kpi.json)

```json
{
  "timestamp": "2026-10-19T12:00:00.000Z",
  "pass_rate": 92,
  "test_count": 150,
  "passed": 138,
  "failed": 12,
  "coverage": 85,
  "ai_danger_rank": "B"
}
```

### KPI 履歴 (kpi-history.json)

```json
[
  {
    "timestamp": "2026-10-18T12:00:00.000Z",
    "pass_rate": 91,
    "test_count": 150,
    "passed": 136,
    "failed": 14,
    "coverage": 84,
    "ai_danger_rank": "B"
  },
  ...
]
```

## 🎨 デザイン

### カラースキーム

- **基調**: 紫色グラデーション (#667eea → #764ba2)
- **成功**: 緑色 (#51cf66)
- **警告**: 橙色 (#ffa94d)
- **危険**: 赤色 (#ff6b6b)

### レスポンシブデザイン

- モバイル（<768px）対応
- タブレット、デスクトップに最適化

### テーマ

- ダークモード対応
- アクセシビリティ対応（WCAG 2.1 AAA）

## 📈 AI危険度ランク説明

AI 危険度ランクは、Jev によって算出される指標で、AI（Copilot）が生成したコードの危険度を示しています。

| ランク | 説明 | 対応 |
|--------|------|------|
| **A** | 非常に安全 | 継続的に品質維持 |
| **B** | 安全 | 定期的にレビュー |
| **C** | 注意が必要 | 強化されたレビュー実施 |
| **D** | 危険 | 即座の改善が必要 |
| **E** | 非常に危険 | 重大な問題に対処 |

### 算出ロジック

```
AI危険度ランク = f(test_pass_rate, code_coverage, issue_count, security_alerts)

例:
- 合格率 < 80% || カバレッジ < 70% → ランク E
- 合格率 < 85% || カバレッジ < 75% → ランク D
- 合格率 < 90% || カバレッジ < 80% → ランク C
- 合格率 < 95% || カバレッジ < 85% → ランク B
- その他 → ランク A
```

## 📋 ISO/IEC 25010 品質特性統計

テーブルに表示される品質特性：

1. **機能適合性** - テスト項目の完全性
2. **性能効率** - パフォーマンステスト
3. **互換性** - クロスプラットフォームテスト
4. **ユーザビリティ** - UIテスト
5. **信頼性** - 安定性テスト
6. **セキュリティ** - セキュリティテスト
7. **保守性** - コード品質テスト
8. **移植性** - 環境テスト

## 🔄 自動更新メカニズム

### ワークフロー連携

```
Quality Schedule (毎週金曜)
         ↓
   テスト実行
         ↓
   KPI 収集
         ↓
Update Dashboard (毎日 AM 10:00)
         ↓
ダッシュボード生成
         ↓
GitHub Pages へデプロイ
```

### データ永続化

- **最新データ**: `qa/dashboard-data/latest-kpi.json`
- **履歴データ**: `qa/dashboard-data/kpi-history.json` (最大90日)
- **生成HTML**: `docs/dashboard/index.html`

## 📊 使用例

### 1. ダッシュボード確認

```
https://cocomomojo.github.io/copilot-quality-harness/dashboard/
```

↓

- リアルタイムの品質指標を確認
- トレンドグラフから改善状況を把握
- 各品質特性の状況を確認

### 2. AI危険度からアクション決定

AI危険度ランク **C** 以下の場合：

```
1. ダッシュボード確認
   ↓
2. 不合格テストを特定
   ↓
3. 原因分析
   ↓
4. 修正実装
   ↓
5. テスト再実行
   ↓
6. ランク改善確認
```

### 3. 定期的な品質評価

**毎週金曜日 AM 5:00 JST の自動実行後：**

1. ダッシュボード確認
2. 週間での改善/悪化を分析
3. 改善が必要な領域を特定
4. 翌週のアクション計画

## 🛠️ カスタマイズ

### ダッシュボード HTML のカスタマイズ

`scripts/generate-dashboard.mjs` を編集：

```javascript
// スタイル変更
const dashboardHTML = `...
  <style>
    /* CSS をカスタマイズ */
  </style>
...`

// チャート追加
new Chart(...) // 新しいグラフを追加

// テーブル項目追加
updateTables(data) // 表示データを追加
```

### KPI 計算ロジックのカスタマイズ

`scripts/generate-dashboard.mjs` の `generateDashboard()` 関数を編集：

```javascript
// AI危険度ランク計算ロジック
let aiDangerRank = 'A';
if (passRate < 80 || coverage < 70) aiDangerRank = 'E';
// カスタマイズ可能
```

## 📚 関連ドキュメント

- [品質特性ベーステスト項目](../quality-characteristics/)
- [テスト管理ガイド](../test-management/)
- [QA ポリシー](../../QA_POLICY.md)
- [CI/CD パイプライン](../../.github/workflows/)

## 🔗 ワークフロー

### generate-quality-items.yml
テスト観点・項目を自動生成

### update-dashboard.yml
ダッシュボードを自動更新・デプロイ

### quality-schedule.yml
定期的な品質チェック実行

## 📞 トラブルシューティング

### ダッシュボードが表示されない

```bash
# ローカルで確認
npm run generate:dashboard -- qa/dashboard-data docs/dashboard

# docs/dashboard/index.html をブラウザで開く
```

### データが古い

```bash
# 手動で KPI を更新
npm run collect-kpi

# ダッシュボードを再生成
npm run generate:dashboard
```

### GitHub Pages が有効でない

リポジトリ設定確認：

1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: main, folder: /docs

---

**最終更新**: 2026-10-19
**自動生成**: GitHub Actions ワークフローによって自動更新されます
