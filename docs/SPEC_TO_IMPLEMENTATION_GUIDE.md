---
layout: default
title: Spec-to-Implementation 統合ワークフロー
---

# Spec-to-Implementation 統合ワークフロー

## 概要

**手順２と３を統合し、Issue から直接に YAML仕様 + 実装 + テストを一気通貫で自動生成します。**

従来の分離されたフロー（Issue → YML生成 → 実装生成）を、統合ワークフローで自動化しました。

### 従来のフロー（面倒）
```
1. Issue 作成
   ↓
2. 手動で Agent に YML 生成を依頼
   ↓
3. `/workspace` コマンドで実装+テスト生成
```

### 新しいフロー（統合型）
```
1. Issue 作成（Given/When/Then 形式）
   ↓
2. GitHub Actions 手動トリガー（workflow_dispatch）
   ↓
3. ワークフロー自動実行
   ├─ [Job 1] Issue → YAML 仕様生成
   ├─ [Job 2] YAML → 実装 + UT + E2E 生成
   └─ [Job 3] 結果通知 + PR 作成
```

## 使用方法

### ステップ 1: Issue を作成

Issue を作成する際に、**受け入れ基準を Given/When/Then 形式で記述** してください。

**例：**
```
## 概要
ユーザー登録フロー

## 受け入れ基準

### シナリオ 1: 正常系 - メール登録成功
\`\`\`
Given: ログイン前のユーザー、"/signup" ページが表示
When:  メールアドレス "user@example.com" を入力して [登録] をクリック
Then:  
  - ステータスコード 201 が返される
  - "確認メールを送信しました" というメッセージが表示される
\`\`\`

### シナリオ 2: 失敗系 - メールフォーマット不正
\`\`\`
Given: ログイン前のユーザー、"/signup" ページが表示
When:  メールアドレス "invalid-email" を入力して [登録] をクリック
Then:
  - ステータスコード 400 が返される
  - エラーメッセージ "有効なメールアドレスを入力してください" が表示される
\`\`\`
```

### ステップ 2: ワークフローをトリガー

GitHub リポジトリの **Actions** タブから、**"Spec-to-Implementation"** ワークフローを選択します。

```
Actions → Spec-to-Implementation (統合型自動生成)
         → Run workflow
         → issue_number: [Issue番号を入力]
         → Run Workflow
```

### ステップ 3: 自動生成を確認

ワークフロー実行後、以下が自動生成されます：

- ✅ **テスト仕様 YAML**: `tests/specs/{feature-name}.yml` がメインブランチにコミット
- ✅ **実装 + テスト**: ドラフト PR が自動作成
- ✅ **Issue コメント**: 結果通知が Issue に投稿

## ワークフロー詳細

### Job 1: `generate-spec-yml`

**役割**: Issue → YAML 仕様を生成

**処理**:
1. GitHub API から Issue を取得
2. Issue body から Given/When/Then を抽出
3. テスト仕様 YAML を生成：`tests/specs/{feature-name}.yml`
4. YAML をメインブランチにコミット

**出力**:
- `spec_file`: 生成された YAML ファイルのパス
- `feature_name`: 抽出された機能名

### Job 2: `generate-implementation`

**役割**: YAML → 実装 + UT + E2E を生成

**処理**:
1. `generate-spec-yml` で生成された YAML を取得
2. 既存スクリプト `generate-tests-from-spec.ts` を実行
   - Unit Tests (UT) を生成
   - E2E Tests (Playwright) を生成
   - Mock 設定を生成
3. ドラフト PR を作成

**出力**:
- `pr_url`: 作成された PR の URL

### Job 3: `summary`

**役割**: 完了通知と結果サマリー

**処理**:
1. ワークフロー実行結果をログに出力
2. Issue にコメント投稿（生成結果と次のステップ）

## スクリプト詳細

### `scripts/generate-spec-from-issue.mjs`

Issue JSON から テスト仕様 YAML を生成します。

**用途**:
```bash
node scripts/generate-spec-from-issue.mjs \
  --issue-file /path/to/issue.json \
  --issue-number 42 \
  --repo-root . \
  --output-dir tests/specs
```

**処理内容**:
1. Issue body から Given/When/Then ブロックを正規表現で抽出
2. シナリオごとに E2E テストケースを生成
3. テスト仕様 YAML テンプレートに統合
4. `tests/specs/{feature-name}.yml` に出力

**出力フォーマット**:
```yaml
test_spec:
  feature: "Issue のタイトル"
  description: "Issue の説明"
  ut:
    - id: "UT-001"
      # ... プレースホルダー
  e2e:
    - id: "E2E-001"
      # ... Given/When/Then から自動生成
  # ... その他の設定
```

### `generate-tests-from-spec.ts` (既存スクリプト)

YAML から UT/E2E テストコードを生成します。

**用途**:
```bash
npx ts-node scripts/generate-tests-from-spec.ts tests/specs/user-registration.yml
```

**生成ファイル**:
- `frontend/src/tests/{feature}.spec.ts` - UT
- `e2e/{feature}.spec.ts` - E2E
- `fixtures/{feature}-mocks.ts` - Mock

## 設定例

### Issue テンプレート との連携

`.github/ISSUE_TEMPLATE/acceptance.md` に以下のフォーマットを記述：

```markdown
## 受け入れ基準

### シナリオ 1: ...
\`\`\`
Given: ...
When:  ...
Then:
  - ...
  - ...
\`\`\`

### シナリオ 2: ...
\`\`\`
Given: ...
When:  ...
Then:
  - ...
\`\`\`
```

## トラブルシューティング

### Q: ワークフローが失敗した

**確認項目**:
1. Issue body に Given/When/Then ブロックが存在するか
2. シナリオが正しくフォーマットされているか（バッククォートの確認）
3. ワークフロー実行ログを確認

```
Actions → ワークフロー実行 → Logs タブを確認
```

### Q: YAML が生成されたが、実装コードが生成されない

**原因**: `generate-tests-from-spec.ts` がエラーで停止している可能性

**対応**:
1. ワークフロー実行ログの `generate-implementation` job を確認
2. YAML ファイルのスキーマが正しいか確認
3. 必要な依存をインストール：`npm install` or `npm install -g ts-node`

### Q: PR が作成されない

**原因**: 生成されたコードに変更がない場合

**確認**:
- ワークフロー実行ログで "No changes generated" が表示されているか
- Issue が十分な情報を含んでいるか

## ベストプラクティス

### Issue 作成時

1. **Given/When/Then を明確に記述**
   - Given: 前提条件（状態）
   - When: アクション（何をしたか）
   - Then: 期待結果（何が起こるべきか）

2. **複数シナリオを含める**
   - 正常系
   - エラー系
   - エッジケース

3. **具体的な例を記載**
   ```
   When: メールアドレス "user@example.com" を入力
   # ✅ 良い: 具体的
   
   When: メールアドレスを入力
   # ❌ 悪い: 抽象的
   ```

### PR レビュー時

1. 自動生成コードを確認
2. プレースホルダーを実装
3. テストを実行して検証
4. マージ前に必ず手動テスト

## 統合ワークフローの利点

| 従来のフロー | 統合ワークフロー |
|----------|------------|
| 手順2、3が分離 | ✅ 統合自動化 |
| 手動トリガーが複数回 | ✅ 1 回のトリガー |
| YML + 実装が別の PR | ✅ 同じ PR |
| セットアップに時間 | ✅ 数秒で完成 |

## 関連ドキュメント

- [Issue テンプレ](../../.github/ISSUE_TEMPLATE/acceptance.md)
- [テスト設計スキル](../../.github/skills/03-test-observation-design.md)
- [実装・テストスキル](../../.github/skills/04-implementation-and-test.md)
- [サンプル仕様](../../tests/specs/footer-copyright.yml)

## 今後の拡張

- [ ] AI による自動プレースホルダー実装
- [ ] テスト実行の自動化
- [ ] カバレッジの自動計測
- [ ] より精密な Given/When/Then パーサー
