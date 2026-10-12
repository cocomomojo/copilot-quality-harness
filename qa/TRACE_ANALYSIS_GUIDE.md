# Playwright トレース解析・Copilot 修正案生成 PoC

## 概要

このドキュメントは、Playwright テスト失敗時に自動的にトレース（trace artifact）を解析し、Copilot が修正案を生成する PoC 実装の使用ガイドです。

## 🚀 クイックスタート

### ステップ 1: ワークフロー実行

GitHub リポジトリ → **Actions** → **Playwright トレース解析（Copilot 修正案生成）** → **Run workflow**

### ステップ 2: パラメータを指定

- `artifact_name`: Playwright trace artifact 名（デフォルト: `playwright-report`）
- `artifact_id`: Artifact ID（オプション）

### ステップ 3: 出力を確認

ワークフロー完了後、以下が生成されます：

1. **trace-summary.json** - トレース要約
2. **analysis.json** - Copilot の分析結果
3. **Draft PR** - 修正提案（ラベル: `copilot-suggestion`）

## 📋 ファイル構成

```
.github/
├── workflows/
│   └── copilot-analyze-trace.yml      # メインワークフロー
├── skills/
│   └── 10-playwright-trace-analysis.md # スキルドキュメント
└── templates/
    └── draft-pr-body.md               # PR テンプレート（qa/ に配置）

scripts/
└── trace-summary.ts                   # TypeScript トレース解析スクリプト

qa/
├── draft-pr-body.md                   # Draft PR テンプレート
└── sample-trace.json                  # テスト用サンプルトレース

tsconfig.json                          # TypeScript 設定
package.json                           # npm スクリプト定義
```

## 🔍 出力フォーマット

### trace-summary.json

```json
{
  "failure_reason": "Test 'login' failed with timeout: waitForSelector exceeded 5s",
  "failing_test": "login",
  "failing_locator": "button[data-testid='submit']",
  "top_console_errors": ["Timeout: waitForSelector exceeded 5000ms"],
  "top_network_failures": ["GET /api/auth failed with 504 Gateway Timeout"],
  "screenshot_paths": ["trace-artifacts/screenshot-1.png"],
  "trace_excerpt": "... (最大 2000 文字のテキスト) ...",
  "failure_category": "timeout",
  "timestamp": "2026-10-12T10:54:47.232Z"
}
```

**failure_category の値:**
- `timeout` - waitFor 関数のタイムアウト
- `network_error` - ネットワーク通信エラー
- `element_not_found` - Locator がページに見つからない
- `assertion_failure` - 値の検証失敗
- `unknown` - 分類不能

### analysis.json

```json
{
  "summary": "ログイン画面でのタイムアウトが原因。ネットワーク遅延により submit ボタンの待機時間不足。",
  "solutions": [
    {
      "title": "修正案 1: タイムアウト時間の延長",
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

### Draft PR 本文

Markdown 形式で以下が含まれます：

- 失敗原因の短い要約（日本語）
- 各修正案の詳細（目的、コード、リスク、検証手順）
- 推奨アクション

**重要**: Draft PR は自動マージされません。必ず人間がレビューしてからマージしてください。

## 🔐 セキュリティ機能

### 秘密情報自動除外

以下が自動的に `[REDACTED]` に置き換えされます：

- API キー（40文字パターン）
- Bearer トークン
- パスワード
- メールアドレス
- 電話番号
- IP アドレス

### その他のセキュリティ対策

- ✅ Draft PR のみ作成（自動マージなし）
- ✅ 人間レビュー必須
- ✅ GITHUB_TOKEN 自動マスク
- ✅ 最小権限で実行（`contents: read`, `pull-requests: write`）

## 🧪 テスト・検証

### サンプルトレースで試す

```bash
# ローカルでトレース解析スクリプトをテスト
npm run analyze:trace -- ./qa/sample-trace.json

# 出力を確認
cat ./qa/trace-summary.json
```

### 既存の Playwright trace artifact で試す

1. リポジトリで Playwright テストを実行
   ```bash
   npm run test:e2e
   ```

2. テスト失敗後、artifact が生成される

3. GitHub Actions で手動ワークフローを実行
   ```
   artifact_name: playwright-report
   ```

## 📊 実行フロー

```
Manual Trigger (workflow_dispatch)
    ↓
📥 Checkout Repository
    ↓
🔧 Setup Node.js + npm ci
    ↓
⬇️ Download Trace Artifact (trace.zip or trace.json)
    ↓
🔍 Run: scripts/trace-summary.ts
    ├─ Trace をパース
    ├─ 失敗情報抽出
    ├─ PII・秘密情報除外
    └─ → trace-summary.json
    ↓
🤖 Copilot Dynamic Workflows
    ├─ trace-summary.json を入力
    ├─ 日本語で分析
    ├─ 修正案 3案生成
    └─ → analysis.json
    ↓
📝 Draft PR 生成
    ├─ ラベル: copilot-suggestion
    ├─ ブランチ: copilot-suggest/<timestamp>
    ├─ 本文: 修正案 Markdown
    └─ Status: Draft (自動マージなし)
    ↓
👤 人間レビュー（必須）
    ├─ 修正案を確認
    ├─ ローカルで実装・テスト
    ├─ CI で全テスト成功確認
    ├─ Draft → Review 状態に変更
    └─ チームレビュー後、手動でマージ
```

## ⚠️ PoC 制約事項

| 項目 | 制約 |
|------|------|
| **トレース形式** | JSON のみ（zip は Phase 2 対応予定） |
| **トリガー** | 手動（`workflow_dispatch`）のみ |
| **修正案数** | 最大 3 案 |
| **言語** | 日本語（すべての出力） |
| **自動マージ** | 禁止 ⛔ |
| **人間確認** | 必須 ✅ |

## 🔧 トラブルシューティング

### Q: `Zip format error` が出た

**原因**: trace.zip ファイル形式がまだ PoC で未対応です。

**解決方法**: JSON 形式の trace ファイルを使用してください。
- `trace.json`
- `trace-summary.json`

### Q: Artifact がダウンロードできない

**原因**: artifact 名が違う、または artifact が削除されている。

**解決方法**: 正確な artifact 名を確認して入力
```
GitHub → Actions → 対象ワークフロー → Artifacts
```

### Q: `ts-node not found` エラー

**原因**: TypeScript が インストールされていない。

**解決方法**: 
```bash
npm ci  # package.json の依存をインストール
```

### Q: Draft PR が作成されない

**原因**: 
- trace ファイルが見つからない
- GitHub Actions 権限不足

**解決方法**:
- trace artifact 名を確認
- リポジトリ設定で Actions 権限を確認

## 📚 参考資料

- [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [GitHub Actions Artifacts](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)
- [GitHub API: Create PR](https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#create-a-pull-request)
- スキル: `.github/skills/10-playwright-trace-analysis.md`
- ガイド: `WORKFLOWS_GUIDE.md` (Appendix セクション)

## 🚀 Phase 2 計画（今後の拡張）

### Phase 2a: Zip ファイル対応
- Playwright trace.zip の自動解凍
- 複数ファイルの統合解析

### Phase 2b: PR トリガー版
- Playwright trace が含まれる PR を自動検出
- 即座に Draft PR を提案

### Phase 2c: 修正コード生成
- Copilot が修正を別ブランチに自動コミット
- より詳細な修正オプション表示

### Phase 3: チーム通知
- Slack / Teams への自動通知
- チーム内ガイドラインの統一

## 📞 サポート

質問や問題がある場合：

1. このドキュメントの「トラブルシューティング」を確認
2. `.github/skills/10-playwright-trace-analysis.md` を参照
3. ワークフロー実行ログを確認（GitHub Actions）
4. Issue を作成して報告

---

**Last Updated**: 2026-10-12  
**Status**: 🧪 PoC (手動トリガー完成)
