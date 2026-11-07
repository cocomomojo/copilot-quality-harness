# 行単位カバレッジレポート ガイド

## 概要

行単位のコードカバレッジを可視化するツールです。テストで実行されたコード行と未実行行を色分けで表示します。

## 使用方法

### 自動生成

```bash
npm run generate:line-coverage
```

### 出力ファイル

- **`docs/dashboard/details/line-coverage.html`** - 全体の行単位カバレッジレポート
  - 各ソースファイルのコード行を表示
  - 緑色: テストで実行された行（カバー済）
  - 赤色: テストで実行されていない行（未カバー）
  - ファイル名でソート（未カバー行が多い順）

## データソース

- **バックエンド**: `backend/coverage/coverage-final.json`（Istanbul 形式）
- **フロントエンド**: `frontend/coverage/coverage-summary.json`（集計済み、行詳細なし）

## ダッシュボード連携

品質ダッシュボード（`docs/dashboard/index.html`）の Coverage 列から：

- **Issue 固有ページ**: `coverage-issue-{number}.html` へリンク
- **全体ページ**: `line-coverage.html` へリンク

## 表示内容

```
📊 Line Coverage Report
├─ 総行数: XXX
├─ カバー済行: XXX (YY%)
├─ 未カバー行: XXX
└─ [ファイルごと]
   ├─ ファイルパス
   ├─ 行数（YY%）
   └─ ソースコード（カラー表示）
```

## GitHub Pages

自動デプロイ後、以下で閲覧可能：

```
https://cocomomojo.github.io/copilot-quality-harness/dashboard/details/line-coverage.html
```

## 技術仕様

### スクリプト: `scripts/generate-line-coverage.mjs`

- **入力**: `backend/coverage/coverage-final.json`
- **処理**:
  1. 各ファイルの statementMap から行マップを構築
  2. statement coverage (s) から実行/未実行を判定
  3. ソースコード行を読み込み
  4. HTML レポートを生成
- **出力**: HTML ファイル（インライン CSS 含）

### 色分けロジック

```javascript
if (coverage >= 80%) → 🟢 Green (#f0fdf4)
if (coverage >= 50%) → 🟡 Yellow (将来対応)
if (coverage < 50%)  → 🔴 Red (#fef2f2)
```

## 制限事項

- フロントエンドは coverage-summary.json のため行詳細表示不可（集計値のみ）
- バックエンド JavaScript のみ対応
- ブランチカバレッジは未対応（行カバレッジのみ）

## 拡張予定

- [ ] フロントエンド行カバレッジ（v2.0）
- [ ] ブランチカバレッジ表示（v2.0）
- [ ] 時系列トレンド追跡（v2.1）
- [ ] 行単位ドリルダウン（v2.1）
