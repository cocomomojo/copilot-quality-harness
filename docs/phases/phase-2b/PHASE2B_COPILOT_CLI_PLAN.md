# Phase 2B: GitHub Copilot CLI Integration

**決定日**: 2026-10-12  
**決定**: GitHub Copilot CLI + Dynamic Workflows 採用  
**ステータス**: 実装準備完了

---

## 1. API 選定プロセス

### 検討対象 4 オプション

| # | オプション | 詳細 | 推奨度 |
|---|-----------|------|--------|
| A | GitHub Copilot REST API | `/copilot/billing`, `/copilot/seats` など。ユーザー・シート管理のみ。コード分析 API なし。 | ❌ 不適 |
| B | OpenAI API (GPT-4) | 汎用 LLM REST API。別課金。"Copilot" ではない。 | ❌ 不適 |
| C | GitHub Copilot SDK | `.github/extensions/` 内の JavaScript SDK。experimental。 | 🟡 バックアップ |
| **D** | **GitHub Copilot CLI** | **`copilot` コマンド。GitHub Actions 内実行。動的ワークフロー対応。** | **✅ 推奨** |

### 選定理由：GitHub Copilot CLI

**✅ 利点**
- GitHub 公式ツール（将来性あり）
- GitHub Actions ネイティブ統合
- 動的ワークフロー（Dynamic Workflows）対応
- 認証: `COPILOT_GITHUB_TOKEN` で簡潔
- 出力: JSON 構造化（parsing 容易）
- 並列実行対応

**❌ Copilot REST API 不選定理由**
- コード分析 API なし（ユーザー管理のみ）
- trace-summary.json を渡す仕組みなし

**❌ OpenAI API 不選定理由**
- 別課金発生
- "Copilot" ではなく ChatGPT
- 設計との矛盾

---

## 2. 実装アーキテクチャ

### 全体フロー

```
GitHub Actions Workflow (copilot-analyze-trace.yml)
  ↓
1. Checkout + npm ci
  ↓
2. Trace artifact download
  ↓
3. scripts/trace-summary.ts 実行
   → trace-summary.json 生成（9 keys）
  ↓
4. .github/extensions/analyze-trace/extension.mjs に渡す
   (Copilot Dynamic Workflow 定義)
  ↓
5. Copilot CLI 実行:
   copilot --experimental --allow-tool=read \
     workflow run analyze-trace-workflow \
     --args @trace-summary.json \
     --output-format json \
     > analysis.json
  ↓
6. analysis.json を Draft PR に変換
  ↓
7. Draft PR 作成（ラベル: copilot-suggestion）
```

### ファイル構成（新規作成）

```
.github/
  ├─ extensions/
  │   └─ analyze-trace/
  │       ├─ extension.mjs          ← Copilot SDK で定義
  │       └─ agent-prompts.md       ← エージェント指示
  ├─ agents/
  │   └─ trace-analyzer.md          ← システムプロンプト
  └─ workflows/
      └─ copilot-analyze-trace.yml  ← 既存（修正予定）
```

---

## 3. 実装タスク（修正版）

### Task 1: Copilot CLI 仕様確認 ✅ 完了
- ✅ 認証: `COPILOT_GITHUB_TOKEN` (fine-grained PAT)
- ✅ インストール: `curl -fsSL https://gh.io/copilot-install | bash`
- ✅ 実行: `copilot workflow run <name> --args @input.json`
- ✅ 出力: JSON with structured format

**決定**:
- 環境変数: `COPILOT_GITHUB_TOKEN` をシークレットから取得
- フラグ: `--experimental --allow-tool=read` が必須
- 認証: GitHub Actions の GITHUB_TOKEN では不足（Copilot スコープなし）
  → ユーザーが fine-grained PAT を `COPILOT_GITHUB_TOKEN` として登録する必要

---

### Task 2: Copilot Dynamic Workflow 定義 (新規)
**ファイル**: `.github/extensions/analyze-trace/extension.mjs`

```javascript
import { defineWorkflow } from "@github/copilot-sdk/extension";

export default defineWorkflow({
  meta: {
    name: "analyze-trace-workflow",
    description: "Playwright trace analysis with fix suggestions"
  },
  async run({ agent, input }) {
    const traceSummary = input; // trace-summary.json 全体
    
    // Step 1: 失敗原因の短い要約（3行）
    const summaryResult = await agent.invoke("summarize-failure", {
      trace: traceSummary,
      language: "ja",
      max_lines: 3
    });

    // Step 2: 再現手順（簡潔）
    const reproResult = await agent.invoke("extract-repro-steps", {
      trace: traceSummary,
      language: "ja"
    });

    // Step 3: 修正案 3 つ（各案に目的・変更・リスク・検証）
    const solutionsResult = await agent.invoke("generate-fixes", {
      trace: traceSummary,
      failure_reason: summaryResult.output.summary,
      max_solutions: 3,
      language: "ja"
    });

    // Step 4: Validate before returning
    const validated = await agent.invoke("validate-solutions", {
      solutions: solutionsResult.output,
      original_trace: traceSummary
    });

    return {
      summary: summaryResult.output.summary,
      repro_steps: reproResult.output.steps,
      solutions: validated.output.solutions,
      timestamp: new Date().toISOString()
    };
  }
});
```

**要件**:
- `@github/copilot-sdk` を `package.json` に追加
- `.github/agents/trace-analyzer.md` でシステムプロンプト定義
- Agent calls は 4 ステップ（要約→再現→修正案→検証）

---

### Task 3: Copilot CLI インストール + テスト（修正）
**ワークフロー修正**: `.github/workflows/copilot-analyze-trace.yml`

```yaml
name: Copilot Analyze Trace
on: workflow_dispatch
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      
      # Step 1: Install Copilot CLI
      - name: Install Copilot CLI
        run: |
          curl -fsSL https://gh.io/copilot-install | bash
          echo "$HOME/.local/bin" >> $GITHUB_PATH

      # Step 2: Verify Copilot CLI
      - name: Verify Copilot CLI
        env:
          COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_GITHUB_TOKEN }}
        run: copilot --version

      # Step 3: npm ci (既存）
      - name: Install dependencies
        run: npm ci

      # Step 4: Download trace artifact
      - name: Download trace artifact
        uses: actions/download-artifact@v4
        with:
          name: playwright-trace
          path: ./trace-artifacts

      # Step 5: Generate trace summary
      - name: Generate trace summary
        run: npx ts-node scripts/trace-summary.ts

      # Step 6: Run Copilot Dynamic Workflow
      - name: Run Copilot workflow
        env:
          COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_GITHUB_TOKEN }}
        run: |
          copilot --experimental --allow-tool=read \
            workflow run analyze-trace-workflow \
            --args @./trace-artifacts/trace-summary.json \
            --output-format json \
            > ./trace-artifacts/analysis.json

      # Step 7: Generate Draft PR
      - name: Create Draft PR
        run: npx ts-node scripts/create-draft-pr.ts
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

### Task 4: 新規スクリプト実装
**ファイル**: `scripts/create-draft-pr.ts`

```typescript
import { readFileSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Analysis {
  summary: string;
  repro_steps: string[];
  solutions: Array<{
    title: string;
    patch: string;
    risk: string;
    verify: string[];
    priority: "high" | "medium" | "low";
  }>;
}

async function createDraftPR() {
  const analysis: Analysis = JSON.parse(
    readFileSync("./trace-artifacts/analysis.json", "utf-8")
  );

  const title = "🤖 Copilot: Playwright トレース分析";
  const body = `## 📋 失敗分析

${analysis.summary}

## 🔄 再現手順

${analysis.repro_steps.map((s) => `- ${s}`).join("\n")}

## 💡 修正案

${analysis.solutions
  .map(
    (sol, i) => `
### 案 ${i + 1}: ${sol.title} [${sol.priority}]

**変更内容**
\`\`\`patch
${sol.patch}
\`\`\`

**リスク**: ${sol.risk}

**検証手順**
${sol.verify.map((v) => `- ${v}`).join("\n")}
`
  )
  .join("\n")}

---
**注**: このドラフト PR は Copilot が自動生成しました。マージする前に必ず人間がレビューしてください。`;

  const branchName = `copilot-suggest/$(date +%s)-$(git rev-parse --short HEAD)`;

  await execAsync(`git checkout -b ${branchName}`);
  await execAsync(`git add .`);
  await execAsync(`git commit -m "copilot: trace analysis suggestions"`);
  await execAsync(`git push origin ${branchName}`);

  const { stdout } = await execAsync(`gh pr create --draft --title "${title}" --body "${body}" --label copilot-suggestion`);
  console.log(`Draft PR created: ${stdout}`);
}

createDraftPR().catch(console.error);
```

---

### Task 5: Agent プロンプト定義
**ファイル**: `.github/agents/trace-analyzer.md`

```markdown
# Playwright Trace Analyzer

## Role
You are an expert Playwright test failure analyst. Analyze trace artifacts and provide:
1. Short 3-line failure summary (Japanese)
2. Concise reproduction steps
3. Up to 3 concrete fix suggestions with code patches
4. Risk assessment and verification steps for each fix

## Constraints
- Always respond in JSON format
- Maximum 2000 characters for logs
- No auto-commit or auto-merge
- Label Draft PR with "copilot-suggestion"
- Include priority (high/medium/low)

## Output Format (JSON)
```json
{
  "summary": "string (3行以内)",
  "repro_steps": ["string"],
  "solutions": [
    {
      "title": "string",
      "patch": "string (unified diff)",
      "risk": "string",
      "verify": ["string"],
      "priority": "high|medium|low"
    }
  ]
}
```
```

---

### Task 6: `package.json` 更新
**追加依存**:
```json
{
  "devDependencies": {
    "@github/copilot-sdk": "^0.1.0-experimental",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.0",
    "@types/node": "^20.0.0"
  }
}
```

---

## 4. 認証設定（ユーザー側）

**重要**: GitHub Actions では、デフォルトの `GITHUB_TOKEN` では Copilot API にアクセスできません。

### 必須ステップ

1. **Fine-grained PAT を生成**
   - GitHub → Settings → Developer Settings → Fine-grained tokens
   - Permissions: `read:copilot`（または最小権限設定）
   - Expiration: 90 days 推奨

2. **シークレット登録**
   - Repository Settings → Secrets and variables → Actions
   - 名前: `COPILOT_GITHUB_TOKEN`
   - 値: 生成した PAT

3. **ワークフロー確認**
   ```yaml
   env:
     COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_GITHUB_TOKEN }}
   ```

---

## 5. テスト計画

### Local Test
```bash
# Step 1: CLI インストール
curl -fsSL https://gh.io/copilot-install | bash

# Step 2: 認証確認
export COPILOT_GITHUB_TOKEN="ghp_xxxxx..."
copilot --version

# Step 3: Workflow 実行テスト
npm run create:test-trace
npx ts-node scripts/trace-summary.ts
copilot workflow run analyze-trace-workflow --args @./trace-artifacts/trace-summary.json
```

### GitHub Actions Test
```bash
gh workflow run copilot-analyze-trace.yml --ref main
```

---

## 6. リスク・制約

| 項目 | 詳細 | 対策 |
|------|------|------|
| Copilot CLI availability | 実験的ツール、今後変更の可能性 | SDK へのフォールバック用意 |
| PAT 管理 | token を環境変数に必要 | secret rotation policy 設定 |
| Rate limiting | Copilot API の呼び出し数制限 | キャッシング、バッチ処理 |
| Network failure | CI 環境でのネットワーク不安定性 | retry ロジック、タイムアウト設定 |

---

## 7. 実装スケジュール

**Week of 2026-10-12**:
- 月: Task 1-2 (Workflow 定義、Agent プロンプト)
- 火: Task 3-4 (CLI インストール、スクリプト実装)
- 水: Task 5-6 (プロンプト調整、PAT 認証テスト)
- 木: ローカルテスト
- 金: GitHub Actions テスト、PR 作成

**完了予定**: 2026-10-18

---

## 8. 成功基準

- [ ] Copilot CLI が GitHub Actions で実行可能
- [ ] Dynamic Workflow が trace-summary.json を処理
- [ ] analysis.json が JSON フォーマットで生成
- [ ] Draft PR が日本語で作成
- [ ] ラベル `copilot-suggestion` 付与
- [ ] 自動マージされない（Draft 状態維持）
- [ ] Copilot レビュー指摘（HIGH）なし
