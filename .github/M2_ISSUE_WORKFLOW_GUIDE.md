# Issue 作成後のフロー・手順 ガイド

GitHub Issue を手動で作成した後、M2 ワークフロー（Issue 解析＋AI 自動判定）を実行するステップバイステップガイドです。

---

## 🎬 【1 分で理解】全体フロー

```
【あなた】           【自動】         【あなた】
  ↓                  ↓                ↓
Issue 作成 → ワークフロー → 分析 + AI判定 → 結果確認 → アクション実施
  (5分)    実行 (1min)   (1-2min)     (2min)    (実装時間)
```

---

## 📝 ステップ 1: Issue を手動で作成

### GitHub Web UI から作成（推奨）

**場所**: https://github.com/cocomomojo/copilot-quality-harness/issues/new

### 記入すべき項目（M2 が評価する項目）

```markdown
## タイトル例
【セキュリティ】ユーザーパスワードの暗号化実装
【機能】検証用Webアプリのヘッダーナビゲーション追加
【バグ】ログイン画面のレイアウト崩れ修正

## 本文に含めるべき内容

### 説明
Issue の背景・なぜこれが必要か

### 受入条件 ✅ (必須)
- [ ] 条件 1
- [ ] 条件 2
- [ ] 条件 3

### テスト要求 ✅ (必須)
- [ ] テスト 1
- [ ] テスト 2
- [ ] E2E テスト

### 影響範囲 ✅ (必須)
- [ ] Frontend のみ
- [ ] Backend のみ
- [ ] Database スキーマ変更
- [ ] 決済機能

### 重大度 ✅ (必須)
- [ ] low
- [ ] medium
- [ ] high
- [ ] critical
```

**チェックリスト**:
- ✅ タイトルが明確か（【優先度】内容）
- ✅ 説明文が具体的か
- ✅ 受入条件が定義されているか
- ✅ テスト要求が明記されているか
- ✅ 影響範囲が明示されているか
- ✅ 重大度が指定されているか

### CLI から作成

```bash
gh issue create \
  --title "【機能】ヘッダーナビゲーション追加" \
  --body "..."
```

作成後、Issue 番号が出力されます（例: `#57`）。

---

## 🚀 ステップ 2: M2 ワークフロー実行（Dispatch）

### Web UI から実行（推奨）

```
1️⃣ GitHub → Actions → "M2 Issue Intake"
2️⃣ "Run workflow" ボタンをクリック
3️⃣ フォーム欄に Issue 番号を入力（例: 57）
4️⃣ "Run workflow" をクリック
```

### CLI から実行

```bash
gh workflow run m2-issue-intake.yml -f issue_number=57
```

実行確認:
```bash
gh run list --workflow m2-issue-intake.yml --limit 1
```

---

## ⏳ ステップ 3-4: 自動分析 + 判定（1-2 分、自動実行）

ワークフローが自動で以下を実行します：

```
✅ Issue #57 データ取得
✅ M2 分析実行（受入条件・テスト要求を抽出）
✅ テストカタログと照合
✅ Markdown に変換
✅ Issue コメント投稿（自動）
✅ AI 判定結果を表示
```

---

## 📊 ステップ 5: Issue コメントから結果確認

### Issue ページに自動コメント投稿されます

```
## M2 自動化ワークフロー: 【判定結果】

Issue: #57
ソース: cocomomojo/copilot-quality-harness (検証済み)

【判定結果】
├─ ✅ safe-proceed     → 自動実装 OK
├─ ⚠️ needs-approval   → 確認後に実装
└─ ❌ manual-only      → 手動判断が必須

【詳細分析】
├─ 重大度: low
├─ 影響範囲: Frontend
├─ 受入条件: 3 個
├─ テスト要求: 4 個
└─ 推奨ブランチ: work/issue-57

...（Markdown テーブル形式の詳細）
```

---

## 🎯 ステップ 6: 判定結果別アクション

### 📊 safe-proceed （自動実装）

```
Issue コメント表示
  ↓
✅ 自動実装が開始される
  - work/issue-57 ブランチ作成
  - コード実装
  - テスト実行
  - PR 自動作成
  ↓
あなたがすること:
□ PR をレビュー
□ テスト結果確認
□ "Merge" をクリック ← これだけ！
```

---

### ⚠️ needs-approval （条件付き）

```
Issue コメント表示
  推奨: 以下を確認してください
  1. デザイン承認
  2. 決済ロジック確認
  3. セキュリティレビュー
  ↓
あなたがすること:
□ 推奨事項をチーム内で確認
□ OKなら Issue にコメント投稿:
  /auto-implement
  ↓
✅ 自動実装が開始される（safe-proceed と同じ）
```

---

### ❌ manual-only （手動実装）

```
Issue コメント表示
  理由: セキュリティ/Backend/複雑度など
  推奨: 以下をご確認ください
  1. 暗号化アルゴリズム選定
  2. キー管理方式
  3. セキュリティレビュー
  ↓
あなたがすること:
□ Issue コメント詳細をレビュー
□ 推奨事項を確認・チーム会議
□ 手動で実装開始:
  git checkout -b work/issue-57
  # コード実装
  npm test
  git push
  gh pr create
□ PR をレビュー → Merge
```

---

## ⚡ クイックコマンド

```bash
# 1️⃣ ワークフロー実行
gh workflow run m2-issue-intake.yml -f issue_number=57

# 2️⃣ Issue を開く（自動コメント確認用）
gh issue view 57 --web

# 3️⃣ 判定結果に応じて
# safe-proceed: 何もしない（自動実装中）

# needs-approval: コメント投稿
gh issue comment 57 -b "/auto-implement"

# manual-only: 手動実装
git checkout -b work/issue-57
```

---

## 📋 チェックリスト

```
【Issue 作成】
□ タイトルに優先度【機能】【バグ】【セキュリティ】
□ 受入条件を定義
□ テスト要求を明記
□ 影響範囲を選択
□ 重大度を指定

【ワークフロー実行】
□ Issue 番号を確認（例: 57）
□ "M2 Issue Intake" を Dispatch
□ ワークフロー実行ログを確認

【結果確認】
□ Issue コメントが投稿されている
□ AI 判定結果を読む
□ 判定に応じてアクション実施
```

---

## 🎓 所要時間

| ステップ | 時間 | 実施者 |
|---------|------|--------|
| 1. Issue 作成 | 5-10分 | あなた |
| 2. ワークフロー実行 | 1分 | あなた |
| 3-4. 分析・判定 | 1-2分 | 自動 |
| 5. 結果確認・アクション | 2-5分 | あなた |
| **合計（実装なし）** | **10-20分** | - |

📝 実装時間は別途（判定レベルによる）

---

## 🆘 よくある質問

### Q: ワークフロー実行に失敗した

**A:** Issue 番号が不正の可能性
```bash
gh issue view --repo cocomomojo/copilot-quality-harness
# Issue 一覧から確認
```

### Q: Issue コメントが投稿されない

**A:** Issue が削除されたか private の可能性
```bash
gh issue view <NUMBER>
```

### Q: AI 判定が "manual-only" なのになぜ？

**A:** AI が以下を検出した可能性:
- セキュリティ関連キーワード
- Backend の実装
- 複雑度が高い

→ Issue コメントの「推奨」欄を確認

---

## 📎 関連ドキュメント

- [`.copilot/m2-auto-judgment-skill.md`](/.copilot/m2-auto-judgment-skill.md) - AI 判定ロジック（詳細）
- [`.github/M2_AI_JUDGMENT_GUIDE.md`](./M2_AI_JUDGMENT_GUIDE.md) - 判定例の詳細説明
- [`.github/workflows/m2-issue-intake.yml`](./workflows/m2-issue-intake.yml) - ワークフロー定義
- [`.github/workflows/m2-issue-intake-with-ai.yml.example`](./workflows/m2-issue-intake-with-ai.yml.example) - AI 判定統合例

---

## 🎓 実装の進化フロー

```
Issue 作成（手動）
    ↓
M2 分析（自動）
├─ 受入条件・テスト要求抽出
├─ 影響範囲・複雑度評価
└─ AI による自動判定
    ↓
判定結果（AI）
├─ safe-proceed     → 自動実装トリガー
├─ needs-approval   → 確認後に自動実装
└─ manual-only      → 手動実装
    ↓
実装開始
├─ ブランチ作成
├─ コード実装
├─ テスト実行
├─ PR 作成
└─ コードレビュー
    ↓
マージ → Issue Close
```

---

**実装が完全に自動化されるまでの流れが明確になったかと思います。不明な点はお気軽にお問い合わせください！** ✨
