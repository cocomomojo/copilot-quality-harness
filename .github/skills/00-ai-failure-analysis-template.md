# Skill Template: AI-Powered Automated Failure Analysis

## 概要

任意の CI/CD 失敗ログを自動解析し、AI（Copilot）が根本原因と修正案を生成する汎用パターン。

**目的**: テスト・ビルド・デプロイ失敗の自動解析と修正案の自動提案で開発効率を向上

**実行者**: GitHub Actions + Copilot Dynamic Workflows

**トリガー**: 手動（workflow_dispatch）/ イベント駆動（pull_request, workflow_run）

---

## 適用可能なシナリオ

| シナリオ | 入力 | 失敗分類 | 修正例 |
|---------|------|---------|-------|
| **Playwright テスト失敗** | trace.zip | timeout, network, element_not_found, assertion | waitFor 時間調整、セレクター修正 |
| **Jest テスト失敗** | test.log | assertion, timeout, import_error | アサーション条件修正、モック設定 |
| **ビルド失敗** | build.log | compile_error, dependency_error, config_error | 型定義追加、依存関係修正 |
| **デプロイ失敗** | deploy.log | deployment_error, permission_error, timeout | 権限設定、リソース割り当て |
| **E2E テスト失敗** | e2e.log | flake, timeout, assertion | リトライロジック追加、待機時間延長 |

---

## 標準フロー

### ステップ 1: 失敗情報の抽出・要約

**入力**: テスト/ビルド失敗ログ、トレース、スクリーンショット等  
**処理**:
```bash
# 失敗ログを解析
scripts/analyze-failure.ts <log-file>
  ├─ failure_type: 何が失敗したか？（テスト、ビルド、デプロイ）
  ├─ failure_reason: なぜ失敗したか？（エラーメッセージ）
  ├─ failure_category: 分類（timeout, assertion_failure, config_error 等）
  ├─ top_errors: 上位 3 つのエラーメッセージ
  ├─ context: ファイル、行番号、スタックトレース
  ├─ log_excerpt: 2000 文字に要約
  └─ timestamp: タイムスタンプ

出力: failure-summary.json（9 キー必須）
```

**実装例（TypeScript）**:
```typescript
interface FailureSummary {
  failure_type: string;           // e.g., "test", "build", "deploy"
  failure_reason: string;
  failure_category: string;       // e.g., "timeout", "assertion_failure"
  top_errors: string[];           // 上位 3 つのエラー
  context: {
    file?: string;
    line?: number;
    stack_trace?: string;
  };
  log_excerpt: string;            // 最大 2000 文字
  failure_severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  metadata: Record<string, any>;  // 任意のメタデータ
}
```

### ステップ 2: Copilot による AI 分析

**入力**: failure-summary.json  
**プロンプト構造**:
```
失敗情報:
- タイプ: [failure_type]
- 理由: [failure_reason]
- 分類: [failure_category]
- エラー: [top_errors]
- コンテキスト: [context]

要件:
1. 日本語で簡潔な要約（3行以内）
2. 最大 3 案の修正案（各案に目的、変更箇所、コード、リスク、検証手順）
3. 優先度を high/medium/low で設定
4. JSON 形式で出力
```

**処理**:
```bash
npx ts-node scripts/copilot-client.ts failure-summary.json
  ├─ buildFailurePrompt() でプロンプト生成
  ├─ Copilot API 呼び出し
  └─ analysis.json を出力

出力: analysis.json
{
  "summary": "要約（3行）",
  "failure_type": "test",
  "solutions": [
    {
      "title": "修正案のタイトル",
      "purpose": "修正の目的",
      "changed_files": ["ファイル1", "ファイル2"],
      "patch": "diff 形式のパッチ",
      "risk": "リスク説明",
      "verify": ["検証手順1", "検証手順2"],
      "priority": "high|medium|low"
    }
  ],
  "generated_at": "ISO 8601"
}
```

### ステップ 3: 結果の提示

**出力オプション**:

**オプション A: Draft PR**
```bash
gh pr create --draft \
  --title "🤖 AI 修正案: <failure_type>" \
  --body "$(cat draft-pr-body.md)" \
  --label copilot-suggestion
```

**オプション B: PR コメント**
```bash
gh pr comment <pr-number> \
  --body "$(cat pr-comment-body.md)"
```

**オプション C: Issue 作成**
```bash
gh issue create \
  --title "⚠️ <failure_type> 失敗分析" \
  --body "$(cat issue-body.md)" \
  --label "needs-investigation"
```

---

## ワークフロー実装パターン

### パターン 1: テスト失敗時の自動分析（PR トリガー）

```yaml
name: AI-Powered Test Failure Analysis
on:
  pull_request:
    types: [opened, reopened]
  workflow_run:
    workflows: [Test Suite]
    types: [completed]
    
jobs:
  analyze-failure:
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      
      - name: Download test logs
        uses: actions/download-artifact@v4
        with:
          name: test-results
          
      - name: Extract failure info
        run: npx ts-node scripts/analyze-failure.ts test-results/
        
      - name: Request Copilot analysis
        run: npx ts-node scripts/copilot-client.ts failure-summary.json
        
      - name: Create Draft PR with suggestions
        run: |
          gh pr create --draft \
            --body-file draft-pr-body.md \
            --label "copilot-suggestion"
```

### パターン 2: ビルド失敗時のコメント投稿

```yaml
name: AI-Powered Build Failure Analysis
on:
  workflow_run:
    workflows: [Build]
    types: [completed]
    
jobs:
  analyze-build:
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      
      - name: Download build logs
        run: gh run view ${{ github.event.workflow_run.id }} --log > build.log
        
      - name: Analyze build failure
        run: npx ts-node scripts/analyze-failure.ts build.log
        
      - name: Get Copilot suggestions
        run: npx ts-node scripts/copilot-client.ts failure-summary.json
        
      - name: Post PR comment
        if: github.event.workflow_run.pull_requests
        run: |
          PR_NUMBER=$(gh pr list -S "head:${{ github.head_ref }}" --json number | jq .[0].number)
          gh pr comment $PR_NUMBER --body-file pr-comment-body.md
```

---

## 実装チェックリスト

### 必須コンポーネント

- [ ] `scripts/analyze-failure.ts`: 失敗情報抽出スクリプト
  - [ ] 複数ログ形式対応（JSON、テキスト、構造化出力）
  - [ ] 失敗分類ロジック（正規表現、パターンマッチング）
  - [ ] PII/シークレット フィルタリング
  - [ ] failure-summary.json 出力

- [ ] `scripts/copilot-client.ts`: Copilot API クライアント
  - [ ] プロンプト生成（failure-summary 向け）
  - [ ] API 呼び出しロジック
  - [ ] JSON 構造化出力
  - [ ] analysis.json 生成

- [ ] `.github/workflows/ai-failure-analysis.yml`: ワークフロー定義
  - [ ] トリガー設定（pull_request / workflow_run）
  - [ ] 条件判定（`if: failure()` など）
  - [ ] キャッシング（npm 依存）

- [ ] テンプレートファイル
  - [ ] `templates/draft-pr-body.md`: Draft PR 本文
  - [ ] `templates/pr-comment-body.md`: PR コメント本文
  - [ ] `templates/issue-body.md`: Issue 本文

### オプショナルコンポーネント

- [ ] `scripts/create-test-failure.ts`: テスト失敗シミュレータ
- [ ] `qa/FAILURE_ANALYSIS_GUIDE.md`: ユーザーガイド
- [ ] ダッシュボード（失敗分析の集計）

---

## 設定例（失敗分類）

### Playwright テスト失敗
```javascript
{
  timeout: /timeout|exceeded|waitfor/i,
  network_error: /network|fetch failed|connection/i,
  element_not_found: /element|locator|not found|not visible/i,
  assertion_failure: /assert|expected|received/i,
  flake: /flaky|intermittent|sometimes fails/i
}
```

### Jest テスト失敗
```javascript
{
  assertion_failure: /expected|toEqual|toBe/i,
  timeout: /timeout|exceeded|jest.setTimeout/i,
  import_error: /cannot find module|SyntaxError/i,
  mock_error: /mock|jest.mock/i,
  async_error: /async|await|Promise/i
}
```

### ビルド失敗
```javascript
{
  compile_error: /error TS|SyntaxError|ParseError/i,
  dependency_error: /cannot find|no such file|ENOENT/i,
  config_error: /config|configuration|invalid option/i,
  permission_error: /permission denied|EACCES/i,
  resource_error: /out of memory|ENOMEM/i
}
```

---

## セキュリティ・制約

✅ **実装済み**:
- PII/シークレット フィルタリング
- 人間レビュー必須（Draft PR、コメントのみ）
- 自動マージなし
- ログからシークレット自動除外

⏳ **今後実装**:
- API レート制限監視
- 監査ログ
- コスト追跡

---

## 関連スキル

- [Skill 10: Playwright トレース解析](./10-playwright-trace-analysis.md)
- [Dynamic Workflows CI/CD](../WORKFLOWS_GUIDE.md#動的ワークフロー)

---

## 使用例

**Playwright テスト失敗に適用**:
```bash
git checkout -b feature/ai-test-analysis
npm run analyze:failure -- trace-artifacts/trace.zip
npm run copilot:analyze -- failure-summary.json
git push origin feature/ai-test-analysis
```

**Jest テスト失敗に適用**:
```bash
npm run analyze:failure -- jest-output.json
npm run copilot:analyze -- failure-summary.json
```

**ビルド失敗に適用**:
```bash
npm run build 2>&1 | tee build.log
npm run analyze:failure -- build.log
npm run copilot:analyze -- failure-summary.json
```

---

## 参考資料

- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Copilot in GitHub Actions](https://github.blog/changelog/2024-01-11-copilot-in-github-actions-is-now-in-public-beta/)
- [TypeScript Error Handling Patterns](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
