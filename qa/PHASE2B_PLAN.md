# Phase 2B: Real Copilot API Integration

## 🎯 目的

現在のモック実装（copilot-client.ts）から実際の Copilot API へ統合し、AI が生成した修正案を本番で利用可能にする。

---

## 📊 現状

### ✅ 既に実装済み（Phase 1 + 2A）

1. **トレース解析基盤** (Phase 1: PR #7)
   - Playwright trace.zip パース
   - 9つの必須キー抽出
   - PII/シークレットフィルタリング
   - failure_category 分類（4カテゴリ）

2. **Zip ファイル + API クライアント** (Phase 2A: PR #8)
   - AdmZip で trace.zip 抽出
   - copilot-client.ts のスケルトン
   - JSON インターフェース定義
   - Mock 実装（リアルな 3 案例）

3. **スキル体系** (本セッション)
   - Skill 00, 01, SKILLS_INDEX
   - 再利用可能なテンプレート

### ⏳ 次に実装すべき（Phase 2B）

1. **Copilot API エンドポイント確認**
   - GitHub Copilot API の正式仕様
   - 認証方法（OAuth, Personal Access Token, etc）
   - Rate limit ポリシー

2. **callCopilotAPI() の実装**
   - Mock → 実装へ置き換え
   - エラーハンドリング
   - リトライロジック

3. **ワークフロー統合テスト**
   - ローカル実行テスト
   - CI での実行
   - Draft PR 生成の検証

4. **pull_request トリガー拡張** (Phase 2C)
   - workflow_dispatch から pull_request へ
   - テスト失敗の自動検出
   - PR コメント投稿モード

---

## 🔧 技術仕様

### API 呼び出しインターフェース

**現在のスケルトン**:
```typescript
// scripts/copilot-client.ts の callCopilotAPI()
async function callCopilotAPI(prompt: string): Promise<CopilotAnalysis> {
  // TODO: 実装予定
  // 現在はモック実装
}
```

### 実装案 A: GitHub Copilot API (推奨)

```typescript
const response = await fetch('https://api.github.com/copilot/analyze', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: prompt,
    language: 'ja',
    max_solutions: 3,
  })
});

const analysis = await response.json();
```

### 実装案 B: 別 LLM API（OpenAI, Anthropic等）

```typescript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
  })
});
```

### 実装案 C: GitHub Actions + Copilot 統合

```yaml
- name: Request Copilot Analysis
  uses: github/copilot-analyze-action@v1
  with:
    prompt: ${{ env.COPILOT_PROMPT }}
    output: analysis.json
    api_token: ${{ secrets.GITHUB_TOKEN }}
```

---

## 📋 タスク分解

### Task 1: API 仕様決定 ⏳

**入力**: GitHub API 仕様確認  
**処理**: 以下を決定
- [ ] API エンドポイント
- [ ] 認証方法
- [ ] Rate limit
- [ ] ペイロード形式
- [ ] 応答形式

**出力**: API 仕様ドキュメント

**推定時間**: 1-2 時間（GitHub Docs 確認 + チーム相談）

---

### Task 2: callCopilotAPI() 実装 ⏳

**入力**: API 仕様、既存スケルトン  
**処理**:
```bash
scripts/copilot-client.ts:
  1. callCopilotAPI() を実装
  2. buildCopilotPrompt() は既存のままで OK
  3. エラーハンドリング追加
  4. タイムアウト・リトライロジック追加
  5. ログ出力強化
```

**出力**: 実装済み copilot-client.ts

**推定時間**: 2-3 時間

**依存**: Task 1 完了

---

### Task 3: ローカルテスト ⏳

**入力**: 実装済み API クライアント  
**処理**:
```bash
# テストフィクスチャで実行
npm run create:test-trace
npx ts-node scripts/copilot-client.ts ./qa/sample-trace-detailed.json

# 出力確認
cat analysis.json
```

**出力**: テスト結果レポート

**推定時間**: 1-2 時間

**依存**: Task 2 完了

---

### Task 4: CI 統合テスト ⏳

**入力**: 実装済み API クライアント  
**処理**:
```yaml
# .github/workflows/copilot-analyze-trace.yml でテスト実行
workflow_dispatch で手動トリガー → 実際の API 呼び出し
```

**出力**: ワークフロー実行ログ

**推定時間**: 2-3 時間（デバッグ込み）

**依存**: Task 3 完了、Task 1 完了

---

### Task 5: Draft PR 検証 ⏳

**入力**: ワークフロー実行結果  
**処理**:
- [ ] Draft PR が正しく作成される
- [ ] PR ボディに analysis.json の内容が反映
- [ ] ラベル copilot-suggestion が付与
- [ ] レビュー割り当てが実行

**出力**: 検証レポート

**推定時間**: 1-2 時間

**依存**: Task 4 完了

---

### Task 6: PR 作成・マージ ⏳

**入力**: 全タスク完了  
**処理**:
```bash
git checkout -b feature/phase-2b-copilot-api
[修正をコミット]
gh pr create --title "feat: Phase 2B - Real Copilot API integration"
[レビュー・マージ]
```

**出力**: PR #9 (Phase 2B)

**推定時間**: 1-2 時間

**依存**: Task 1-5 完了

---

## 🗺️ 実装ロードマップ

```
現在
  ↓
[Task 1] API 仕様決定 (1-2h)
  ↓
[Task 2] callCopilotAPI() 実装 (2-3h)
  ↓
[Task 3] ローカルテスト (1-2h)
  ↓
[Task 4] CI 統合テスト (2-3h)
  ↓
[Task 5] Draft PR 検証 (1-2h)
  ↓
[Task 6] PR 作成・マージ (1-2h)
  ↓
Phase 2B 完成
  ↓
Phase 2C: pull_request トリガー拡張 (計画中)
```

**合計推定時間**: 9-14 時間

---

## 🎯 成功基準

- [ ] callCopilotAPI() が実 API を呼び出す
- [ ] 日本語の修正案が返される（mock と同じ形式）
- [ ] Draft PR が正しく生成される
- [ ] workflow_dispatch での手動実行が成功
- [ ] CI ログが正常に出力される
- [ ] エラーハンドリングが機能する
- [ ] PR #9 でマージ可能

---

## 📝 ドキュメント予定

- `qa/PHASE2B_PROGRESS.md` – Phase 2B 進捗追跡
- `API_INTEGRATION.md` – API 実装ガイド
- SKILLS_INDEX.md に Phase 2B セクション追記

---

## ⚠️ リスク・制約

### リスク 1: API 仕様不確定
- **影響**: Task 1 でハマる可能性
- **対策**: GitHub Copilot API ドキュメント確認、必要に応じてチーム相談

### リスク 2: Rate Limit
- **影響**: CI で頻繁に呼び出すと API エラー
- **対策**: キャッシング、リトライロジック、バックオフ戦略

### リスク 3: API 応答フォーマット
- **影響**: Mock と異なる可能性
- **対策**: JSON スキーマ検証、エラーハンドリング強化

---

## 🚀 推奨アクション

### 即座（今日）:
1. GitHub Copilot API 仕様確認（Task 1）
2. API エンドポイント・認証方法を決定

### 短期（1-2日）:
1. callCopilotAPI() 実装（Task 2-3）
2. ローカルテスト実行
3. CI テスト（Task 4-5）

### 中期（1週間）:
1. PR #9 マージ
2. Phase 2C 計画開始（pull_request トリガー）

---

## 📊 予想効果

| メトリクス | 現状 | Phase 2B後 |
|-----------|------|-----------|
| API呼び出し | ❌ なし（mock） | ✅ 実運用 |
| Draft PR生成 | ❌ mock データ | ✅ AI生成 |
| テスト失敗時の修正案 | ❌ 手動解析 | ✅ 自動提案 |

---

## 🎓 関連ドキュメント

- `.github/skills/10-playwright-trace-analysis.md` – 現 Phase 1 ガイド
- `.github/skills/SKILLS_INDEX.md` – スキル全体像
- `qa/PHASE2_PROGRESS.md` – Phase 2A 進捗（参考）

---

## 次のステップ

ユーザーからの指示待機:
- [ ] Phase 2B を即座に開始したいか？
- [ ] 他のタスク（Jest解析等）を先にしたいか？
- [ ] GitHub Copilot API の仕様は既知か？

**推奨**: Phase 2B から開始（依存関係が明確、PoC から自然な流れ）
