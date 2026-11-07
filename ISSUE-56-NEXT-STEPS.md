# Issue #56 - 次のステップ実行ガイド

## 📍 現在の状況

| フェーズ | ステータス | 説明 |
|--------|-----------|------|
| **Issue #56 作成** | ✅ 完了 | 【機能要望】検証用Webアプリのヘッダーナビゲーション・ローディング表示追加 |
| **M2 Issue Intake** | ✅ 完了 | 受入条件を Spec 形式に自動変換 |
| **Spec-to-Implementation** | ✅ 完了 | Spec からコード・テストを自動生成 |
| **PR #57 生成** | ✅ 完了 | GitHub Actions が PR を自動作成（DRAFT 状態） |
| **PR レビュー・マージ** | ⏳ 待機中 | ← **あなたの操作が必要** |

---

## 🎯 次のステップ（5つの操作）

### ステップ 1️⃣: PR #57 の内容を確認

**実施内容**:
1. GitHub で [PR #57](https://github.com/cocomomojo/copilot-quality-harness/pull/57) を開く
2. 「**Files changed**」タブをクリック
3. 以下のファイルが追加・修正されているか確認:

```
✓ frontend/src/components/Header.jsx - 新規作成
  └─ Header コンポーネント（タイトル、ダークバー）

✓ frontend/src/components/LoadingSpinner.jsx - 新規作成
  └─ ローディング表示コンポーネント

✓ frontend/src/App.jsx - 修正
  └─ Header・Loading 機能を統合

✓ backend/tests/** - テストファイル追加
✓ frontend/tests/** - テストファイル追加
✓ e2e/** - E2E テストファイル追加
```

**確認ポイント**:
- [ ] Header コンポーネントが作成されている
- [ ] Loading 表示機能が実装されている
- [ ] 既存コードの破壊がない
- [ ] 新規 npm パッケージが追加されていない

---

### ステップ 2️⃣: テストが PASS しているか確認

**実施内容**:
1. PR #57 の「**Checks**」タブをクリック
2. 以下のテストが全て ✅ PASS しているか確認:

```
✅ Test Matrix
  ├─ Unit Tests (backend)
  ├─ Unit Tests (frontend)
  ├─ E2E Tests
  └─ Advanced Tests

✅ AI Review (自動コードレビュー)
```

**テスト失敗時の対応**:

| 失敗内容 | 対応方法 |
|--------|--------|
| Unit Test 失敗 | ワークフロー実行ログで詳細を確認 → エラー修正 |
| E2E Test 失敗 | ブラウザ自動操作ログを確認 → 実装修正 |
| AI Review 警告 | コードスタイル・品質の指摘 → 修正推奨 |

**次に進む条件**:
- 全テストが ✅ PASS していること
- あるいは、許容範囲のワーニングのみであること

---

### ステップ 3️⃣: コードレビュー（手動確認）

**受入条件の確認**:

Issue #56 の受入条件に対して、実装が満たしているか確認:

```
✅ シナリオ 1: ユーザーがアクセス時、ダーク背景のヘッダーが表示
   → Header.jsx が「Copilot Quality Harness Dash」を表示しているか確認

✅ シナリオ 2: アクションボタン時、1秒未満でローディング表示
   → LoadingSpinner が表示されているか、クリックで発動するか確認

✅ シナリオ 3: 処理終了後に結果が表示、画面崩れなし
   → テストで検証済みか確認（E2E-002）
```

**品質チェック**:
- [ ] コードスタイルが統一されている（インデント・命名規則）
- [ ] エラーハンドリングが実装されている（try-catch 等）
- [ ] パフォーマンス要件を満たしている（ローディング < 1000ms）
- [ ] 既存機能が壊れていない

---

### ステップ 4️⃣: PR マージ

**前提条件**:
- ✅ テストが全て PASS している
- ✅ 手動レビューが完了している
- ✅ 受入条件を満たしている

**マージ手順**:

#### 4-1. DRAFT → Ready for Review に変更

1. PR #57 を開く
2. 「**Still in draft?**」の「**Mark as ready for review**」をクリック

#### 4-2. Approve & Merge

1. PR のコメント欄に「**Approve**」をクリック（またはコメント）
2. 「**Merge pull request**」ボタンをクリック
3. 「**Squash and merge**」を推奨（コミット履歴をクリーン化）

```bash
# マージオプション推奨:
Squash and merge（複数コミットを 1 つにまとめる）
  理由: 履歴がシンプルになり、revert が容易になる
```

4. コミットメッセージを確認:
   ```
   【機能要望】検証用Webアプリのヘッダーナビゲーション・ローディング表示の追加（Issue #56）
   ```

5. 「**Confirm merge**」をクリック

---

### ステップ 5️⃣: マージ後の自動ワークフロー確認

**自動的に実行されるもの**:

マージ直後、以下のワークフローが **自動で実行** されます：

```
🔄 Test Matrix（最適化版）
   └─ backend/, frontend/, scripts/ の変更を検知
   └─ 全テストを実行（unit, api, e2e, advanced）
   └─ 約 3-5 分で完了

🔄 Quality Report PR（最適化版）
   └─ Test Matrix 成功時のみ実行
   └─ テスト結果を集約した PR コメントを投稿

🔄 Update Quality Dashboard（最適化版）
   └─ Test Matrix 成功時のみ実行
   └─ KPI ダッシュボードを更新
```

**確認方法**:

1. [Actions](https://github.com/cocomomojo/copilot-quality-harness/actions) ページを開く
2. 「**Test Matrix**」ワークフローが実行中か確認
3. 約 3-5 分後に全テストが ✅ PASS するのを待つ

---

## ❌ トラブルシューティング

### Q1. PR #57 が見つからない

**原因**: PR がまだ生成されていない

**対応**:
1. Spec-to-Implementation の最新実行結果を確認
   ```bash
   gh run list -w spec-to-implementation.yml --limit 1
   ```

2. ジョブが「成功」していても、PR 作成ステップでエラーの可能性
3. ワークフロー実行ログで「Create PR」ステップを確認

### Q2. テストが失敗している

**原因**: 実装エラーまたは既存コード破壊

**対応**:
1. ワークフロー実行ログで失敗の詳細を確認
2. エラーメッセージに基づいて修正
3. ローカルで修正後、実装ブランチに push
4. PR は自動的に更新される

### Q3. マージできない（Merge ボタンが灰色）

**原因**: テスト失敗またはレビュー待機

**対応**:
1. 「**Why is it grayed out?**」をクリックして理由を確認
2. 「Require status checks to pass before merging」が有効な場合
   → 全チェックが ✅ PASS するまで待機
3. 「Require reviews before merging」が有効な場合
   → 自分のレビュー承認をクリック

---

## 📚 参考情報

| リンク | 説明 |
|--------|------|
| [Issue #56](https://github.com/cocomomojo/copilot-quality-harness/issues/56) | 元の Issue（受入条件） |
| [PR #57](https://github.com/cocomomojo/copilot-quality-harness/pull/57) | 自動生成された PR |
| [実装ブランチ](https://github.com/cocomomojo/copilot-quality-harness/tree/copilot/impl-issue-56) | copilot/impl-issue-56 |
| [Actions](https://github.com/cocomomojo/copilot-quality-harness/actions) | ワークフロー実行履歴 |

---

## ✅ チェックリスト

マージ前に以下をすべて確認してください：

- [ ] Issue #56 の内容を確認した
- [ ] PR #57 の「Files changed」を確認した
- [ ] すべてのテストが ✅ PASS している
- [ ] 受入条件を満たしていることを確認した
- [ ] コードレビューを完了した
- [ ] 既存機能が破壊されていないことを確認した

---

## 🎉 完了後

マージが完了すると：

1. ✅ PR #57 が `main` ブランチにマージされる
2. ✅ 自動ワークフロー（Test Matrix など）が実行される
3. ✅ ダッシュボード・品質レポートが更新される
4. ✅ Issue #56 の実装が完了

**次のステップ（任意）**:
- Issue #56 をクローズ（手動）
- 別の Issue で新しい自動化フロー を実行
- より複雑な Issue で M2 自動化の安定性をテスト

---

**作成日**: 2026-11-07  
**ガイド**: Issue #56 次のステップ実行方法
