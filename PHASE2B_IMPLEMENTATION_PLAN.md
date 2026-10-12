# Phase 2B Implementation Plan

## 現状確認

✅ **PR #8 マージ完了**
- Zip ファイルサポート実装
- copilot-client.ts スケルトン完成
- テストフィクスチャ準備
- Skill 体系構築完成

⏳ **次: Phase 2B（実 Copilot API 統合）**

---

## 🎯 Phase 2B の目的

現在の **Mock 実装** → **実 Copilot API 呼び出し** へ統合

```typescript
// 現在（Mock）
async function callCopilotAPI(prompt: string): Promise<CopilotAnalysis> {
  console.warn('⚠️ This is a placeholder');
  return { /* ダミー応答 */ };
}

// Phase 2B後（実装）
async function callCopilotAPI(prompt: string): Promise<CopilotAnalysis> {
  const response = await fetch('https://api.github.com/copilot/...', {
    headers: { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` }
  });
  return await response.json();
}
```

---

## 📋 実装タスク（6ステップ）

### Task 1: API 仕様決定 [1-2h]

**確認すべき項目**:
- [ ] GitHub Copilot API のエンドポイント
- [ ] 認証方法（Token 形式、Scope）
- [ ] Rate Limit ポリシー
- [ ] リクエスト/レスポンス フォーマット
- [ ] エラーコード・ハンドリング

**アウトプット**: API 仕様ドキュメント

**推奨候補**:
- 案 A: GitHub Copilot API
- 案 B: OpenAI / Anthropic API（代替案）
- 案 C: GitHub Actions 統合アクション

---

### Task 2: callCopilotAPI() 実装 [2-3h]

**ファイル**: `scripts/copilot-client.ts`

**修正内容**:
```typescript
async function callCopilotAPI(prompt: string): Promise<CopilotAnalysis> {
  try {
    // 1. API 呼び出し
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` },
      body: JSON.stringify({ prompt, language: 'ja' })
    });
    
    // 2. エラーハンドリング
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    // 3. レスポンスパース
    const data = await response.json();
    
    // 4. 応答フォーマット検証
    validateCopilotAnalysis(data);
    
    return data;
  } catch (error) {
    // 5. リトライロジック（オプション）
    if (isRetryable(error)) {
      return await retryWithBackoff(() => callCopilotAPI(prompt));
    }
    throw error;
  }
}
```

**追加する部分**:
- エラーハンドリング
- タイムアウト設定
- リトライロジック
- ログ出力

---

### Task 3: ローカルテスト [1-2h]

**テスト手順**:
```bash
# 1. API キーを環境変数に設定
export GITHUB_TOKEN=ghp_xxxxx

# 2. テストフィクスチャ生成
npm run create:test-trace

# 3. ローカル実行
npx ts-node scripts/copilot-client.ts ./qa/sample-trace-detailed.json

# 4. 出力確認
cat trace-artifacts/analysis.json
jq . trace-artifacts/analysis.json
```

**検証項目**:
- [ ] API が正常に呼び出される
- [ ] analysis.json が生成される
- [ ] JSON フォーマットが正しい
- [ ] エラーハンドリングが機能する

---

### Task 4: CI 統合テスト [2-3h]

**ワークフロー**: `.github/workflows/copilot-analyze-trace.yml`

**テスト手順**:
```bash
# 1. GitHub Secrets に API キーを設定
gh secret set GITHUB_TOKEN --body <token>

# 2. ワークフロー手動実行
gh workflow run copilot-analyze-trace.yml

# 3. ログ確認
gh run list --workflow copilot-analyze-trace.yml
gh run view <run-id> --log

# 4. 出力アーティファクト確認
gh run download <run-id>
```

**検証項目**:
- [ ] ワークフロー実行成功
- [ ] analysis.json アーティファクト生成
- [ ] ログに API 呼び出し記録あり
- [ ] エラーログなし

---

### Task 5: Draft PR 検証 [1-2h]

**検証項目**:
- [ ] Draft PR が正しく作成される
- [ ] PR タイトルが適切
- [ ] PR ボディに修正案が反映
- [ ] ラベル `copilot-suggestion` が付与
- [ ] レビュー割り当てが実行
- [ ] 自動マージが発生していない

**チェックリスト**:
```bash
# Draft PR が存在するか
gh pr list --state all --json title,state

# PR コンテンツ確認
gh pr view <pr-id> --json body

# ラベル確認
gh pr view <pr-id> --json labels
```

---

### Task 6: PR 作成・マージ [1-2h]

**PR 作成**:
```bash
git checkout -b feature/phase-2b-copilot-api
git add scripts/copilot-client.ts qa/PHASE2B_PROGRESS.md
git commit -m "feat: Phase 2B - Real Copilot API integration

Implement actual API calls replacing mock implementation:
- Add callCopilotAPI() with GitHub Copilot API integration
- Implement error handling and retry logic
- Add timeout and rate limit handling
- Update workflow logging

Phase 2B Status:
✅ API 実装
✅ ローカルテスト
✅ CI テスト
✅ Draft PR 生成

Closes issue #<number> (if any)

Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>"

gh pr create --title "feat: Phase 2B - Real Copilot API integration" \
  --body-file pr-description.md
```

**マージ前確認**:
- [ ] 全テスト通過
- [ ] Copilot review クリア
- [ ] ドキュメント更新
- [ ] qa/PHASE2B_PROGRESS.md 完成

---

## 🔄 ワークフロー

```
PR #8 マージ完了 ✅
        ↓
Task 1: API 仕様確定 [1-2h]
        ↓
Task 2: API 実装 [2-3h]
        ↓
Task 3: ローカルテスト [1-2h]
        ↓
Task 4: CI テスト [2-3h]
        ↓
Task 5: Draft PR 検証 [1-2h]
        ↓
Task 6: PR 作成・マージ [1-2h]
        ↓
Phase 2B 完成 ✅
        ↓
Phase 2C: pull_request トリガー拡張（計画中）
```

**合計時間**: 9-14 時間

---

## 🎯 成功基準

- [x] PR #8 マージ完了
- [ ] Task 1: API 仕様を確定できた
- [ ] Task 2: callCopilotAPI() が実 API を呼び出す
- [ ] Task 3: ローカルテストで analysis.json 生成成功
- [ ] Task 4: CI ワークフロー実行成功
- [ ] Task 5: Draft PR が正しく生成される
- [ ] Task 6: PR #9 作成・マージ完了

---

## 📚 参考資料

- `qa/PHASE2_PROGRESS.md` – Phase 2A 進捗（参考）
- `.github/skills/10-playwright-trace-analysis.md` – トレース解析ガイド
- `.github/workflows/copilot-analyze-trace.yml` – ワークフロー定義
- `scripts/copilot-client.ts` – 実装対象ファイル

---

## 🚀 推奨スケジュール

| 時期 | タスク | 責任者 |
|------|--------|--------|
| 本日 | Task 1-2 実施 | AI Agent / チーム確認 |
| 明日 | Task 3-4 実施 | AI Agent |
| 1日後 | Task 5-6 実施 | AI Agent |
| 完了予定 | Phase 2B マージ | 予定:今週中 |

---

## 💡 実装ポイント

### 1. API 認証
```typescript
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN not set');

const headers = {
  'Authorization': `Bearer ${GITHUB_TOKEN}`,
  'Content-Type': 'application/json',
  'Accept': 'application/vnd.github.v3+json'
};
```

### 2. エラーハンドリング
```typescript
if (response.status === 401) {
  throw new Error('Authentication failed - check GITHUB_TOKEN');
} else if (response.status === 429) {
  // Rate limit - retry with backoff
  await delay(60000);
} else if (!response.ok) {
  throw new Error(`API error: ${response.status} ${response.statusText}`);
}
```

### 3. タイムアウト設定
```typescript
const timeout = 30000; // 30 秒
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeout);

try {
  const response = await fetch(url, { signal: controller.signal });
  // ...
} finally {
  clearTimeout(timeoutId);
}
```

### 4. リトライロジック
```typescript
async function retryWithBackoff(fn: () => Promise<T>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

---

## 📋 チェックリスト（実装時）

### 実装前
- [ ] GitHub Copilot API 仕様を確認
- [ ] 認証トークンの取得方法を確認
- [ ] Rate limit を確認
- [ ] Branch 作成: `feature/phase-2b-copilot-api`

### 実装中
- [ ] callCopilotAPI() を実装
- [ ] エラーハンドリングを追加
- [ ] ログ出力を強化
- [ ] 型チェック: `tsc --noEmit`
- [ ] Lint: `npm run lint`

### テスト実施
- [ ] ローカルテスト実行
- [ ] CI ワークフロー実行
- [ ] Draft PR 生成確認
- [ ] エラーケース検証

### PR 作成
- [ ] コミットメッセージに詳細記載
- [ ] ドキュメント更新
- [ ] qa/PHASE2B_PROGRESS.md 作成
- [ ] PR 説明に実装内容を記載

---

## 次のアクション

**推奨**: Phase 2B を即座に開始

1. GitHub Copilot API 仕様を確認（Task 1）
2. callCopilotAPI() 実装開始（Task 2）

**質問待機**:
- GitHub Copilot API の仕様は既知ですか？
- 認証方法の推奨案はありますか？
- Phase 2B を今すぐ始めるべきですか？

---

**作成日**: 2026-10-12  
**ステータス**: 計画完成、実装待機中
