# Skill 10: Playwright トレース解析と Copilot 修正案生成

## 概要

Playwright テスト失敗時、自動的にトレース（trace artifact）を解析し、Copilot が修正案を生成する PoC ワークフロー。

**目的**: CI 失敗の原因特定と修正方針を自動化し、開発効率を向上させる

**実行者**: 主に GitHub Actions ワークフロー（部分的に人間レビュー）

**トリガー**: 手動（`workflow_dispatch`）、将来的に PR トリガーへ拡張予定

---

## 実行フロー

### Phase 1: トレース解析（自動）

```
1. Playwright trace artifact をダウンロード
2. scripts/trace-summary.ts を実行
   ├─ trace.zip をパース
   ├─ 失敗原因を抽出（test, locator, errors）
   ├─ failure_category に自動分類
   │  ├─ timeout
   │  ├─ network_error
   │  ├─ element_not_found
   │  └─ assertion_failure
   ├─ PII・秘密情報を除外
   └─ trace-summary.json を出力
3. trace_excerpt を 2000 文字に要約
```

### Phase 2: Copilot 分析（Copilot Dynamic Workflows）

```
4. trace-summary.json を Copilot に渡す
5. Copilot が以下を返す：
   ├─ 失敗要約（日本語、3行）
   ├─ 再現手順
   ├─ 修正案 3 案
   │  ├─ 修正案 1: 目的、変更箇所、コード、リスク、検証手順
   │  ├─ 修正案 2: （同上）
   │  └─ 修正案 3: （同上）
   ├─ 優先度（高/中/低）
   └─ 期待効果
6. 結果を analysis.json に保存
```

### Phase 3: Draft PR 作成（自動）

```
7. qa/draft-pr-body.md をテンプレートに Draft PR 本文を生成
8. gh pr create --draft でDraft PRを作成
   ├─ ラベル: copilot-suggestion
   ├─ ブランチ: copilot-suggest/<timestamp>
   ├─ 自動マージ: なし（重要）
   └─ レビューワー: 自動割当て
9. PR コメントで修正案を提示
```

### Phase 4: 人間レビュー（必須）

```
10. 開発者が Draft PR を確認
11. 修正案を評価・選択
12. 対応する修正を実装
13. ローカル・CI で検証
14. Draft → Review 状態に変更
15. チームレビュー後、手動でマージ
```

---

## 入力・出力仕様

### 入力（workflow_dispatch）

```yaml
inputs:
  artifact_name:
    description: "Trace artifact 名（例: playwright-report）"
    default: "playwright-report"
  artifact_id:
    description: "Artifact ID（オプション）"
```

### 出力ファイル

#### 1. trace-summary.json（必須キー）

```json
{
  "failure_reason": "Test 'login' failed with timeout: waitForSelector exceeded 5s",
  "failing_test": "login",
  "failing_locator": "button[data-testid='submit']",
  "top_console_errors": [
    "Timeout: waitForSelector exceeded 5000ms",
    "Element not visible"
  ],
  "top_network_failures": [
    "GET /api/auth failed with 504 Gateway Timeout"
  ],
  "screenshot_paths": [
    "trace-artifacts/screenshot-1.png"
  ],
  "trace_excerpt": "... 最大 2000 文字のテキスト ...",
  "failure_category": "timeout",
  "timestamp": "2026-10-12T10:54:47.232Z"
}
```

#### 2. analysis.json（Copilot 出力）

```json
{
  "summary": "ログイン画面でのタイムアウトが原因。ネットワーク遅延により submit ボタンの待機時間不足。",
  "solutions": [
    {
      "title": "タイムアウト時間の延長",
      "priority": "高",
      "purpose": "テスト実行時のタイムアウトエラーを解決",
      "changed_files": ["e2e/login.spec.ts"],
      "patch": "- await page.waitForSelector(selector, { timeout: 5000 })\n+ await page.waitForSelector(selector, { timeout: 10000 })",
      "risk": "テスト実行時間が増加（約1分）",
      "verify": ["ローカルで再現テスト実行", "CI で全テスト成功確認"]
    }
    // ... 他の案
  ]
}
```

#### 3. Draft PR 本文

- マークダウン形式
- 日本語で失敗要約、修正案、検証手順を記載
- 自動マージなし表記を明示

---

## 停止条件（Stop Conditions）

ワークフロー実行を中止する場合：

1. **trace artifact がない** → エラーログを出力して中止
2. **trace-summary.ts 失敗** → 失敗理由をログして中止
3. **Copilot 応答異常** → エラーレポート、Draft PR は作成しない
4. **GitHub 権限不足** → エラーメッセージで通知

人間が対応を停止する場合：

1. **修正案が適用不可能** → コメントで理由を記載して Draft PR をクローズ
2. **修正案のリスクが高い** → 代替案を検討
3. **ワークフロー自体の問題** → Issue を作成して報告

---

## 制約・要件

### 必須制約

| 項目 | 要件 |
|------|------|
| **言語** | 日本語（すべての出力） |
| **自動マージ** | 禁止（Draft PR のみ） |
| **ログ要約** | 最大 2000 文字 |
| **失敗分類** | 4 カテゴリに限定 |
| **シークレット除外** | PII、API キー、トークン自動除外 |
| **人間レビュー** | 必須（Draft PR マージ前） |

### セキュリティ

- ✅ API キー、トークンを正規表現で除外
- ✅ メールアドレス、電話番号を除外
- ✅ IP アドレスをマスク
- ✅ ファイルパスを正規化
- ✅ ログ内の秘密情報を [REDACTED] に置き換え

---

## チェックリスト（実装者向け）

### 実装前

- [ ] Playwright trace artifact の構造を理解
- [ ] TypeScript で trace パースロジックを確認
- [ ] Copilot Dynamic Workflows API を確認

### 実装中

- [ ] scripts/trace-summary.ts が 9 個の必須キーを出力
- [ ] failure_category が 4 カテゴリに正しく分類
- [ ] シークレットフィルタが機能
- [ ] ワークフロー YAML が有効
- [ ] Copilot 連携ステップが定義

### テスト・検証

- [ ] ローカルで trace-summary.ts が動作
- [ ] 既存の trace artifact で手動実行
- [ ] trace-summary.json が正しいフォーマット
- [ ] Copilot が修正案を返す
- [ ] Draft PR が正常に作成される
- [ ] 自動マージが行われないこと確認
- [ ] ログにシークレットが含まれないこと確認

### ドキュメント

- [ ] このスキル（10-playwright-trace-analysis.md）完成
- [ ] WORKFLOWS_GUIDE.md に追記
- [ ] README に使用方法を記載

---

## トラブルシューティング

| 問題 | 原因 | 解決方法 |
|------|------|---------|
| trace artifact がない | artifact 名が違う | inputs で正しい名前を指定 |
| trace-summary.ts 失敗 | trace 形式が不正 | trace ファイルをチェック |
| Copilot が応答しない | ネットワークエラー | リトライ or タイムアウト確認 |
| Draft PR が作成されない | gh コマンド権限不足 | GITHUB_TOKEN を確認 |
| ログにシークレット表示 | フィルタ漏れ | SECRET_PATTERNS を拡張 |

---

## 参考資料

- [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [GitHub Actions artifacts](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)
- [Copilot Dynamic Workflows](https://github.com/features/copilot)
- [GitHub API: create PR](https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#create-a-pull-request)

---

## 今後の拡張

### Phase 2: PR トリガー版（安定後）
- PR に Playwright trace が含まれる場合、自動実行
- ラベル指定トリガーも検討

### Phase 3: 修正の自動提案実装
- Copilot が修正コードを生成
- 修正を別ブランチに自動コミット（still Draft）

### Phase 4: チーム統合
- Slack / Teams への通知
- チーム内ガイドラインの統一

---

_スキル 10: Playwright トレース解析（2026-10-12 作成）_
