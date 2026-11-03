# Copilot CLI 統合計画

## 概要

本リポジトリのスクリプトを段階的に **GitHub Copilot CLI** に置き換える計画です。

正規表現ベースのパーサーの限界を超え、**セマンティックな判定** を AI に依頼することで、より堅牢で柔軟なシステムを構築します。

---

## 背景：スクリプトの限界

### 現在の問題点

| スクリプト | 問題 | 原因 |
|----------|------|------|
| `scripts/m2-validation.mjs` | マークダウンのバリエーション対応が不十分 | 正規表現ベースのパーサー |
| `scripts/ai-review.mjs` | コード品質判定に定式化が必要 | ルールベースの評価 |
| `scripts/trace-summary.ts` | Playwright トレースログ解析が複雑 | 手動パースロジック |

### Copilot CLI の利点

- **セマンティック理解**: マークダウンのバリエーション対応
- **自然言語処理**: 曖昧な表現も理解可能
- **柔軟性**: ルール追加時に実装不要
- **保守性**: AI が説明可能な理由を提示

---

## Phase 1: M2 禁止キーワード判定の移行

### 現状（正規表現ベース）

```javascript
// セキュリティセクション内の禁止キーワード検出
if (/(?:認証|個人情報|決済|破壊的.{0,12}(?:DB|データベース))/i.test(securitySection)) {
  policyStops.push('issue mentions restricted scope');
}
```

**問題：** 「認証を含まない軽微なUI改善」でも「認証」キーワード検出 → 停止

### 改善案（Copilot CLI 使用）

```javascript
async function assessSecurityRiskWithCopilot(securitySection, issueTitle) {
  const prompt = `
    以下のセキュリティ要件について、実装時のリスク（認証実装、個人情報処理など）があるか判定してください。
    
    Issue: ${issueTitle}
    セキュリティ・プライバシー要件: ${securitySection}
    
    "RISK: はい" または "RISK: いいえ" で答えてください。
  `;
  
  const result = await copilot.ask(prompt);
  return result.includes('RISK: はい');
}
```

**効果：**
- セマンティック判定で「含まない」を理解
- Issue #56 の例：「認証を含まない」→ RISK: いいえ → 自動化可能 ✅

### 実装タイムライン

- [ ] Phase 1a: GitHub Copilot Chat API の調査・評価
- [ ] Phase 1b: `copilot --json` サポートの確認
- [ ] Phase 1c: 実装 + テスト
- [ ] Phase 1d: 正規表現ロジックの段階的削除

---

## Phase 2: 他スクリプトの置き換え検討

### スクリプト一覧と置き換え可能性

| スクリプト | 用途 | Copilot CLI 置き換え可能性 | 優先度 |
|-----------|------|------------------------|------|
| `scripts/m2-validation.mjs` | Issue テンプレート検証 | 🟢 高（Phase 1） | ⭐⭐⭐ |
| `scripts/ai-review.mjs` | コード品質レビュー | 🟢 高 | ⭐⭐⭐ |
| `scripts/trace-summary.ts` | E2E トレース分析 | 🟡 中（ファイル大き目） | ⭐⭐ |
| `scripts/copilot-client.ts` | CLI クライアント | 🟢 高（統合ハブに） | ⭐⭐⭐ |

### Phase 2a: `ai-review.mjs` の置き換え

**現状：** コミット差分から問題を正規表現で検出

**改善：** 差分を Copilot CLI に送信 → AI レビュー

```bash
copilot review --diff <commit> --json
```

**期待効果：** より正確なコード品質判定、説明の自動生成

### Phase 2b: `trace-summary.ts` の置き換え

**現状：** Playwright トレースを手動で JSON 解析

**改善：** トレースを Copilot CLI に送信 → テスト実行サマリー自動生成

```bash
copilot analyze --trace <path-to-trace> --json
```

**期待効果：** テスト失敗原因の自動分析、ログの自動要約

---

## 実装方針

### 1. フォールバック機構

常に正規表現ロジックを保持し、Copilot CLI が利用不可の場合は従来の動作に戻す：

```javascript
function assessSecurityRisk(section, title) {
  // 試行: Copilot CLI
  try {
    return copilot.assess(section);
  } catch (e) {
    // フォールバック: 正規表現
    console.warn('Copilot CLI unavailable, using regex fallback');
    return /restricted_keyword/i.test(section);
  }
}
```

### 2. 段階的移行

- Phase 1 → Phase 2a → Phase 2b の順序
- 各フェーズで テスト + レビュー + ドキュメント更新
- 正規表現削除は最終段階でのみ

### 3. API の統一

```javascript
// 統一インターフェース
interface CopilotRequest {
  prompt: string;
  context?: Record<string, string>;
  format?: 'text' | 'json' | 'markdown';
}

async function copilot(request: CopilotRequest): Promise<string> {
  // Phase 1: CLI 実装
  // Phase 2: Chat API 統合
  // Phase 3: 複数バックエンドサポート
}
```

---

## TODO リスト

### Phase 1: M2 禁止キーワード移行

- [ ] GitHub Copilot Chat API ドキュメント確認
- [ ] `copilot --json` / `copilot --api` サポート調査
- [ ] プロンプト設計・最適化
- [ ] 実装 + ユニットテスト
- [ ] Issue #56 での再テスト
- [ ] 正規表現ロジック削除（段階的）

### Phase 2a: コード品質レビュー移行

- [ ] `ai-review.mjs` のコード理解
- [ ] Copilot CLI レビューコマンド評価
- [ ] 実装
- [ ] 既存テストケースとの互換性確認

### Phase 2b: E2E トレース分析

- [ ] Playwright トレース形式の理解
- [ ] Copilot CLI 分析機能の評価
- [ ] 実装

### ドキュメント

- [ ] このファイル更新（進捗記載）
- [ ] 各フェーズの結果レポート作成
- [ ] ユーザー向けガイド

---

## 参考資料

- [GitHub Copilot CLI ドキュメント](https://github.com/features/copilot)
- [copilot-quality-harness Issue #56](../issues/56)
- [M2 バリデーションスクリプト](../scripts/m2-validation.mjs)

---

## 質問・フィードバック

このドキュメントは段階的に更新されます。提案や質問は Issue で受け付けます。
