# E2E Test Reports と実装動画の表示機能

> **重要（2026-10-25 更新）**
> - E2E レポート生成は Test Matrix と同一 `run_id` を使って実行されます。
> - 動画/画像アセットは同名衝突（例: `video.webm`）を避けるため、コピー時に一意名へ変換します。
> - 詳細ページには「実行エビデンス」セクション（Run URL / JSON / Workflow）を表示します。

## 概要

このプロジェクトは、Playwright E2E テストの実行結果を GitHub Pages に自動的に出力し、ダッシュボードから詳細なレポートへアクセスできるようにしています。

## 機能

### 📊 E2E テストレポート

- **テストケース別の詳細レポート**: 各テストケースの実行結果、実行時間、エラーメッセージ
- **スクリーンショット**: テスト失敗時のスクリーンショット（ギャラリー表示）
- **実装動画**: テスト実行時に記録されたビデオを HTML5 プレイヤーで再生
- **フィルタリング**: テスト状態（全て/成功/失敗/スキップ）でフィルタリング
- **自動更新**: GitHub Actions ワークフローにより毎日自動更新

### 🎬 実装動画の表示

- **ブラウザ内ビデオプレーヤー**: 追加インストール不要で動画を再生
- **複数フォーマット対応**: WebM、MP4 形式をサポート
- **リモート表示**: GitHub Pages でリモート環境から動画を視聴可能
- **証跡リンク統合**: Test Matrix 実行ログ・JSON・Workflow へ直接遷移可能

## ファイル構成

```
docs/
  dashboard/
    index.html              # メインダッシュボード（E2E セクション追加）
    data/                   # ダッシュボード用データ
  reports/
    e2e-latest.html        # E2E テスト詳細レポート（生成）
    data/
      test-cases.json      # テスト結果データ（生成）

scripts/
  generate-e2e-report.ts             # E2E レポート生成スクリプト
  generate-e2e-details-page.mjs      # 詳細レポート HTML 生成

qa/
  e2e-report/
    test-cases.json        # テスト結果 JSON（生成）
```

## 使用方法

### 1. E2E テスト実行とレポート生成

```bash
# Playwright テスト実行（ビデオ記録有効）
npm run test:e2e

# E2E レポート生成
npm run generate:e2e-report

# E2E 詳細ページ生成
npm run generate:e2e-details -- qa/e2e-report/test-cases.json docs/reports
```

### 2. ダッシュボードで確認

- URL: `/dashboard/` にアクセス
- 「🎬 E2E テスト実行レポート」セクションから詳細レポートへジャンプ
- 各テストケースの動画を再生

### 3. CI/CD による自動更新

GitHub Actions `update-dashboard.yml` ワークフローが以下を自動実行：

1. Playwright テスト実行（`test-matrix.yml`）
2. E2E レポート JSON 生成
3. E2E 詳細 HTML ページ生成
4. GitHub Pages にデプロイ

## データ形式

### test-cases.json スキーマ

```json
{
  "timestamp": "2026-10-18T10:30:00Z",
  "totalSuites": 3,
  "totalTests": 12,
  "passed": 10,
  "failed": 1,
  "skipped": 1,
  "passRate": 0.833,
  "duration": 45000,
  "metadata": {
    "test_run_id": "40182565160"
  },
  "suites": [
    {
      "name": "Quality Checks",
      "file": "e2e/quality-checks.spec.js",
      "totalTests": 5,
      "passed": 4,
      "failed": 1,
      "skipped": 0,
      "duration": 20000,
      "tests": [
        {
          "name": "should validate dashboard",
          "title": "Dashboard validation",
          "status": "passed",
          "duration": 5000,
          "file": "e2e/quality-checks.spec.js",
          "errors": [],
          "screenshots": [],
          "videos": ["./videos/9e07...abc.webm"]
        }
      ]
    }
  ]
}
```

## 🔐 整合性ポリシー

1. `metadata.test_run_id` は KPI 側 `details.github_run_id` と一致すること
2. `videos[]` は固有パスを優先し、汎用 `./video.webm` への収束を避けること
3. 実行エビデンス（Run URL, test-cases.json）をページ内から辿れること

## トラブルシューティング

### テスト動画が表示されない

1. Playwright テスト実行時に `video: 'on'` または `video: 'retain-on-failure'` が有効か確認
   - 例: `use: { video: 'on' // または 'retain-on-failure' }`
   - `playwright.config.js` で設定確認
2. `./test-results/videos/` に動画ファイルが存在するか確認
3. サポートされた形式（WebM、MP4）か確認
4. `docs/reports/videos/` に一意ファイル名で配置されているか確認
5. `docs/reports/data/test-cases.json` の `videos[]` が実在ファイルを指しているか確認

### レポート JSON が生成されない

1. Playwright テスト結果ファイルの保存場所を確認：
   - `./test-results/`
   - `./artifacts/`
   - `./playwright-report/`
2. スクリプト実行時のエラーログを確認：
   ```bash
   npm run generate:e2e-report 2>&1 | tee e2e-report.log
   ```

### HTML ページが表示されない

1. `docs/reports/` ディレクトリが存在するか確認
2. `generate-e2e-details-page.mjs` のアクセス権限を確認
3. データファイルパスが正しいか確認

## GitHub Actions ワークフロー統合

`update-dashboard.yml` ワークフローに以下のステップが追加されました：

```yaml
- name: Download Playwright test results
  uses: actions/download-artifact@v4
  with:
    path: ./artifacts
    pattern: test-results-*

- name: Resolve target Test Matrix run ID
  # workflow_run 起点では同一 run_id を利用

- name: Generate E2E report
  run: ts-node scripts/generate-e2e-report.ts qa/e2e-report

- name: Generate E2E details page
  run: node scripts/generate-e2e-details-page.mjs "qa/e2e-report/test-cases.json" "docs/reports"
```

## 設定と最適化

### ビデオ保持ポリシー

Playwright 設定：
```javascript
// playwright.config.js
use: {
  video: 'on',                  // 全テスト記録
  trace: 'on'                   // 成功テスト含むステップ/trace 記録
}
```

> 成功テストでも「Playwright公式レポート相当のステップ証跡」を表示したい場合は `trace: 'on'` を推奨します。  
> 容量を抑えたい場合は `PW_TRACE_MODE=retain-on-failure` で切り替え可能です。

### GitHub Actions アーティファクト保持

```yaml
retention-days: 30  # 30 日間保持
```

## パフォーマンスに関する注意

- E2E テスト動画は高容量（テストあたり 1-10MB）
- CI/CD アーティファクト保持期間を適切に設定
- GitHub Pages リポジトリサイズ制限に注意

## 参考資料

- [Playwright テスト実行](../OPERATION_FLOW.md)
- [ダッシュボード](../QUALITY_DASHBOARD_IMPLEMENTATION.md)
- [Quality Report Generation](../GENERATION_VERIFICATION_REPORT.md)

---

**最終更新**: 2026-10-25

