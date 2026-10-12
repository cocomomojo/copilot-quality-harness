# Phase 2B Setup Guide: GitHub Copilot CLI 統合

**Date**: 2026-10-12  
**Status**: 実装完了、セットアップ待機

---

## 📋 セットアップ手順

### Step 1: Fine-grained PAT を生成

1. GitHub にログイン
2. **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
3. **Generate new token** をクリック
4. 以下を入力:

| 項目 | 値 |
|------|-----|
| Token name | `copilot-trace-analysis` |
| Expiration | 90 days |
| Repository access | All repositories (or specific repo) |
| Permissions | `read:copilot` (最小権限) |

5. **Generate token** をクリック
6. トークンをコピー（後で使用）

### Step 2: リポジトリシークレットに登録

1. GitHub リポジトリ: cocomomojo/copilot-quality-harness
2. **Settings → Secrets and variables → Actions**
3. **New repository secret** をクリック
4. 以下を入力:

| 項目 | 値 |
|------|-----|
| Name | `COPILOT_GITHUB_TOKEN` |
| Secret | Step 1 で生成したトークン |

5. **Add secret** をクリック

---

## 🚀 ワークフロー実行テスト

### オプション A: GitHub Actions UI から実行

1. **Actions** タブ → **Playwright トレース解析（Copilot 修正案生成）**
2. **Run workflow** ボタンをクリック
3. `artifact_name` 入力（例: `playwright-report`）
4. **Run workflow** をクリック

**期待結果:**
- ✅ Copilot CLI インストール成功
- ✅ Copilot workflow 実行成功
- ✅ analysis.json 生成
- ✅ Draft PR 作成

### オプション B: CLI から実行

```bash
gh workflow run copilot-analyze-trace.yml \
  -f artifact_name="playwright-report" \
  --ref main
```

---

## 📊 ワークフロー実行フロー

```
GitHub Actions Workflow Start
  ↓
Step 1: Repository Checkout
  ↓
Step 2: Node.js 20 Setup
  ↓
Step 3: Dependencies Install (npm ci)
  ↓
Step 4: Download Trace Artifact
  ├─ If found: continue
  └─ If not found: skip to end with warning
  ↓
Step 5: Generate trace-summary.json
  ├─ scripts/trace-summary.ts 実行
  └─ Output: 9-key JSON (failure_reason, failing_test, etc.)
  ↓
Step 6: Install Copilot CLI ✨ NEW
  ├─ curl -fsSL https://gh.io/copilot-install | bash
  └─ Verify: copilot --version
  ↓
Step 7: Run Copilot Dynamic Workflow ✨ NEW
  ├─ Auth: COPILOT_GITHUB_TOKEN from secrets
  ├─ Workflow: analyze-trace-workflow
  ├─ Input: trace-summary.json
  └─ Output: analysis.json (structured JSON)
  ↓
Step 8: Generate Draft PR Body ✨ NEW
  ├─ scripts/create-draft-pr.ts 実行
  ├─ Parse analysis.json
  └─ Generate Markdown with solutions
  ↓
Step 9: Create Branch & Push
  ├─ Branch: copilot-suggest/trace-<timestamp>-<hash>
  ├─ Commit: analysis artifacts
  └─ Push to origin
  ↓
Step 10: Create Draft PR
  ├─ gh pr create --draft
  ├─ Label: copilot-suggestion
  ├─ Base: main
  └─ NO auto-merge (Draft 保持)
  ↓
Success! 📌 Draft PR 作成完了
```

---

## 🔍 トラブルシューティング

### エラー 1: `COPILOT_GITHUB_TOKEN is not set`

**原因**: リポジトリシークレットが未登録

**解決**:
1. Step 2 に従ってシークレット登録
2. ワークフロー再実行

### エラー 2: `Copilot workflow failed` or CLI timeout

**原因**: GitHub Copilot CLI が応答しない

**対策**:
- GitHub Copilot のステータスを確認: https://www.githubstatus.com/
- トークンの権限確認（`read:copilot` スコープ）
- ワークフロータイムアウト延長（デフォルト: 6h）

### エラー 3: `analysis.json is empty`

**原因**: Copilot ワークフロー出力が空

**確認**:
1. ワークフロー実行ログを確認
2. `copilot workflow run` の出力を見る
3. Agent prompt が正しく処理されているか確認

### エラー 4: Draft PR が作成されない

**原因**: `gh` CLI の権限不足または GitHub Token エラー

**解決**:
```bash
# ローカルで gh CLI を認証
gh auth login
# Branch 手動確認
git log --oneline origin/copilot-suggest/* | head -5
```

---

## 📝 Analysis JSON の構造

ワークフロー成功時、`./trace-artifacts/analysis.json` は以下の構造:

```json
{
  "status": "success",
  "summary": "セレクタが見つからない。テスト実行時にバージョン 20.11.0 で...",
  "repro_steps": [
    "npm test",
    "E2E テストスイート実行",
    "..."
  ],
  "solutions": [
    {
      "id": 1,
      "title": "Fix title",
      "purpose": "目的",
      "patch": "unified diff",
      "risk": "リスク",
      "verify_steps": ["step1", "step2"],
      "priority": "high"
    }
  ],
  "metadata": {
    "failure_category": "element_not_found",
    "failing_test": "test name",
    "generated_at": "2026-10-12T11:51:15.178Z",
    "workflow_version": "1.0.0"
  }
}
```

---

## ✅ 検証チェックリスト

ワークフロー実行後、以下を確認:

- [ ] **GitHub Actions**: ワークフロー実行ログが success ステータス
- [ ] **trace-summary.json**: `./trace-artifacts/` に生成
- [ ] **analysis.json**: Copilot が JSON を生成（JSON フォーマット正常）
- [ ] **Draft PR**: GitHub PR ページに `[Copilot 提案]` タイトルで表示
- [ ] **PR ラベル**: `copilot-suggestion` ラベルが付与
- [ ] **PR 状態**: Draft（Open ではない）
- [ ] **PR コメント**: 修正案が Markdown で表示
- [ ] **PR ファイル変更**: artifacts が qa/trace-analyses に追加
- [ ] **自動マージ**: されていない（Draft だから OK）

---

## 🎯 次のステップ

### 即座（今週）
1. ✅ Fine-grained PAT を生成・登録
2. ✅ ワークフロー手動実行でテスト
3. ✅ Draft PR 生成の確認
4. ✅ Copilot の提案品質評価

### Phase 2B-2（推奨: 1-2週間後）
- pull_request トリガーに拡張
- 自動テスト失敗時に自動実行
- Agent prompt の改善（ユーザーフィードバック反映）
- キャッシング・レート制限対策

### Phase 2C（推奨: 1ヶ月後）
- 複数テスト失敗の並列解析
- Copilot に複数ファイル修正を提案させる
- チーム内での修正案の投票機能
- 実装状況の自動追跡

---

## 📚 リソース

- **Copilot CLI ドキュメント**: https://github.com/github/copilot-cli
- **Copilot Extensions**: https://docs.github.com/en/copilot/building-copilot-extensions
- **Dynamic Workflows**: https://docs.github.com/en/copilot/concepts/agents/dynamic-workflows

---

## 🔐 セキュリティに関する注意

### トークン管理
- ✅ Fine-grained PAT（限定権限）を使用
- ✅ 90 日の有効期限を設定
- ✅ Repository secrets で管理（ローカルに保存しない）
- ✅ 定期的なトークン ローテーション推奨

### ログセキュリティ
- ✅ ワークフロー ログから自動的にシークレットをマスク
- ✅ 出力 JSON には個人情報（PII）を含めない
- ✅ trace-summary.ts で既に PII フィルタリング実装済み

### Draft PR のセキュリティ
- ✅ Draft PR（Open ではない）→ 自動マージ不可
- ✅ ラベル `copilot-suggestion` で識別可能
- ✅ 人間レビュー必須（Draft → Review に変更時）

---

## 💬 サポート

問題が発生した場合:
1. ワークフローログを確認（Actions タブ）
2. GitHub Status ページを確認: https://www.githubstatus.com/
3. この README の トラブルシューティング セクションを参照
4. リポジトリ Issue を作成して報告

---

**セットアップ完了後、ワークフロー実行をお願いします！** 🚀
