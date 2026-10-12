# Phase 2 実装進捗レポート

**作成日**: 2026-10-12  
**ステータス**: 進行中（3/5 完了）

## 概要

Playwright トレース解析ワークフロー（copilot-analyze-trace）の Phase 2 実装を進めています。Phase 1 (PoC) で構築した手動トリガー版から、本格的な Copilot API 統合と自動トリガー機能へ進化させます。

---

## Phase 2 タスク一覧

### ✅ 完了タスク

#### 1. **Zip ファイル抽出サポート** (p2-01 + p2-02)
- **実装**: `scripts/trace-summary.ts` に AdmZip 統合
- **機能**:
  - Playwright trace.zip から trace.json を自動抽出
  - ネストされたパス対応（resources/trace.json など）
  - JSON ファイルフォールバック
  - ユーザーフレンドリーなエラーメッセージ
- **制約**:
  - PoC は JSON/テキストのみ対応していたが、本ワークフロー動作に必須
- **コミット**: `60b0b86`

#### 2. **Copilot API クライアント スタブ** (p2-04)
- **新規ファイル**: `scripts/copilot-client.ts`
- **機能**:
  - JSON-based Copilot 統合インターフェース
  - 日本語プロンプト生成（buildCopilotPrompt）
  - 構造化出力（CopilotAnalysis インターフェース）
  - 3-solution の現実的なモック実装
  - ts-node 実行対応
- **特徴**:
  - TypeScript インターフェース型安全性
  - 再利用可能なクライアント設計
  - Phase 2B の本実装予定地

---

### ⏳ 進行中タスク

#### 3. **ワークフロー テスト用フィクスチャ** (p2-03)
- **新規ファイル**: 
  - `qa/sample-trace-detailed.json` - 詳細なトレースデータ
  - `scripts/create-test-trace.ts` - テスト用 trace.zip 生成スクリプト
- **目的**: ローカル・CI でワークフローを安全にテスト
- **進捗**: 初期実装完了、npm script 登録

---

### ⏳ 保留中タスク

#### 4. **実際の Copilot API 統合** (p2-05)
- **依存**: p2-04 (API クライアント完成)
- **実装予定**:
  - GitHub Copilot API endpoint 統合
  - 認証情報管理（secrets）
  - API 呼び出しのエラーハンドリング
  - レート制限対応
- **タイムライン**: Phase 2B

#### 5. **pull_request トリガー追加** (p2-06)
- **依存**: p2-02 (Zip 対応), p2-05 (API 統合)
- **実装予定**:
  - `on: pull_request` イベント追加
  - テスト失敗時の自動トリガー
  - PR コメント自動投稿モード（Draft PR 代替案）
- **制約**: 自動マージなし、人間レビュー必須
- **タイムライン**: Phase 2C

---

## ワークフロー統合状況

### 現在のフロー

```
手動トリガー（workflow_dispatch）
  ↓
1️⃣ trace-artifacts ダウンロード
  ↓
2️⃣ npm ci → 依存インストール（adm-zip 含む）
  ↓
3️⃣ trace-summary.ts 実行
   - Zip ファイル抽出 ✅ 実装済み
   - trace-summary.json 生成
  ↓
4️⃣ copilot-client.ts 実行（NEW）
   - analysis.json 生成 ✅ 実装済み
  ↓
5️⃣ Draft PR 作成
   - copilot-suggestion ラベル付与
   - 人間レビュー待機
```

### 実装ファイル変更

| ファイル | 変更内容 | コミット |
|---------|---------|----------|
| `package.json` | adm-zip + create:test-trace script 追加 | 60b0b86 |
| `scripts/trace-summary.ts` | Zip 抽出機能実装 | 60b0b86 |
| `scripts/copilot-client.ts` | Copilot API クライアント（新規） | 60b0b86 |
| `.github/workflows/copilot-analyze-trace.yml` | copilot-client.ts 統合 | 60b0b86 |
| `scripts/create-test-trace.ts` | テスト Zip 生成（新規） | TBD |
| `qa/sample-trace-detailed.json` | 詳細テストデータ（新規） | TBD |

---

## 次のアクション

### 短期（本日中）
1. ✅ `scripts/create-test-trace.ts` をコミット
2. ✅ `qa/sample-trace-detailed.json` をコミット
3. 新規 PR #8 作成（Phase 2 Initial Implementation）

### 中期（1-2 週間以内）
1. Copilot API エンドポイント確認（GitHub Copilot API vs. 別の LLM API）
2. API 認証・シークレット管理の設計
3. 実装: p2-05（Real API Integration）
4. ローカル テスト検証

### 長期（2-4 週間後）
1. p2-06 実装：pull_request トリガー
2. エンドツーエンド テスト
3. 本番運用開始

---

## リスク・制約

| リスク | 対応策 |
|--------|--------|
| **Copilot API の仕様不明** | GitHub Copilot API ドキュメント確認、サポートに問い合わせ |
| **レート制限** | API 呼び出し数の監視、バッチ処理検討 |
| **Zip ファイルの複雑な構造** | 実際の trace.zip 構造に基づくテスト強化 |
| **パフォーマンス** | API 呼び出しタイムアウト設定、非同期処理検討 |

---

## 成功指標

- [ ] Zip ファイルサポート: PoC より改善 ✅
- [ ] API クライアント: TypeScript 型安全性確保 ✅
- [ ] テスト: 手動トリガーで正常動作確認
- [ ] API 統合: 実際の Copilot 出力を Draft PR に反映
- [ ] PR トリガー: テスト失敗時に自動分析・提案

---

## 参考資料

- [PR #7 - Playwright トレース解析 PoC](https://github.com/cocomomojo/copilot-quality-harness/pull/7)
- [スキル: 10-playwright-trace-analysis.md](.github/skills/10-playwright-trace-analysis.md)
- [クイックスタート: qa/TRACE_ANALYSIS_GUIDE.md](qa/TRACE_ANALYSIS_GUIDE.md)
