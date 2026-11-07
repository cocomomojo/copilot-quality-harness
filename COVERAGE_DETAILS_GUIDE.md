# カバレッジ詳細表示機能 実装完了ガイド

## ✅ 実装内容

### 1. カバレッジ詳細ページ生成
- **scripts/generate-coverage-details.mjs**: 全Issue のカバレッジ詳細ページを自動生成
- **出力ファイル**:
  - `docs/dashboard/details/coverage-details.html` - グローバルカバレッジ
  - `docs/dashboard/details/coverage-issue-{number}.html` - Issue ごとのカバレッジ

### 2. 表示情報
- **Lines カバレッジ**: 実行済み行数/総行数（パーセンテージ）
- **Branches カバレッジ**: 実行済みブランチ数/総ブランチ数（パーセンテージ）
- **未カバー行**: テスト対象外の行番号を列挙
- **ステータス表示**: 色分け（緑≥80%、黄50-80%、赤<50%）

### 3. ダッシュボード連携
- **リンク配置**: ダッシュボードの Coverage 列
- **動作**: Issue ごとのカバレッジ詳細ページに遷移
- **ブレッドクラムナビゲーション**: 詳細ページから元のレポートに戻る

### 4. npm スクリプト
```bash
npm run generate:coverage-details
# → coverage-details.html + coverage-issue-{number}.html を生成
```

## 📊 カバレッジデータ形式対応

### バックエンド (backend/coverage/coverage-final.json)
- 形式: 詳細形式（行ごとの実行回数）
- 処理: 実行回数 > 0 で「カバー」と判定

### フロントエンド (frontend/coverage/coverage-summary.json)
- 形式: サマリー形式（集計済み）
- 処理: 両形式を自動判定・統合

## 🔗 アクセスパス

### GitHub Pages
- ダッシュボード: `https://cocomomojo.github.io/copilot-quality-harness/dashboard/`
- Issue #56 カバレッジ: `./details/coverage-issue-56.html`
- Issue #44 カバレッジ: `./details/coverage-issue-44.html`
- グローバルカバレッジ: `./details/coverage-details.html`

## 🚀 今後の拡張
1. CI/CD パイプラインで自動実行（test-matrix.yml 完了後）
2. より詳細な行単位のカバレッジ表示
3. 時系列のカバレッジ推移グラフ
4. Issue ごとの品質向上ダッシュボード

## ✨ ユーザーメリット
- パス・非パスの見える化で、テストが不足しているコードを把握可能
- Issue ごとのカバレッジ追跡で品質劣化を防止
- ダッシュボードから直接詳細をドリルダウン可能
