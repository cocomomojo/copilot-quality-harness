# エラーハンドリング・安定性強化ガイド

**実装日**: 2026-11-07  
**対応版**: spec-to-implementation v2.0

## 概要

M2 自動化ワークフロー（M2 Issue Intake → spec-to-implementation）の根本的なエラーハンドリング強化を実施しました。複雑な Issue でも安定的に動作するよう、以下の改善を行いました。

---

## 📋 実装内容

### 1. **Centralized Error Handler** (`scripts/workflow-error-handler.mjs`)

各ステップでのエラー検出・ログを一元管理するユーティリティスクリプト。

#### 機能

- **Spec ファイル検証** (`validate-spec`)
  - ファイル存在確認
  - ファイルサイズチェック（最小 50 bytes）
  - YAML 形式検証
  - E2E テスト数確認（0 個の場合は警告）

- **環境変数検証** (`validate-env`)
  - 必須変数の存在確認
  - 空値チェック

- **エラーキャプチャ** (`capture-error`)
  - エラー情報を JSON 形式で `/tmp/workflow_errors.json` に記録
  - タイムスタンプ、コンテキスト情報を保持

- **通知生成** (`generate-notification`)
  - エラーカテゴリに応じた Issue コメント用テンプレート生成
  - 重大度レベル分類
  - 推奨アクション提示

#### 使用例

```bash
# Spec ファイル検証
node scripts/workflow-error-handler.mjs validate-spec tests/specs/web.yml 56

# エラーキャプチャ
node scripts/workflow-error-handler.mjs capture-error \
  "TEST_GENERATION_FAILED" \
  "ts-node exited with code 1" \
  '{"issue_number": "56", "spec_file": "web.yml"}'

# 通知生成
node scripts/workflow-error-handler.mjs generate-notification \
  SPEC_GENERATION_FAILED \
  '{"message": "シナリオが見つかりません"}'
```

---

### 2. **Test Validation Helper** (`scripts/test-validation-helper.mjs`)

テスト実行結果の自動検証・レポート生成。

#### 機能

- **テスト出力検証** (`check-test-output`)
  - 失敗パターン検出（FAIL/Error/TypeError など）
  - テスト数カウント
  - 成功率計算
  - 最小テスト数チェック

- **失敗抽出** (`extract-failures`)
  - 失敗したテストを自動抽出
  - エラーメッセージ取得

- **レポート生成** (`generate-test-report`)
  - Markdown 形式のテスト実行レポート生成
  - Issue 番号付き
  - 失敗詳細と対応方法を記載

#### 使用例

```bash
# テスト出力検証
node scripts/test-validation-helper.mjs check-test-output /tmp/test_output.log 3

# テストレポート生成
node scripts/test-validation-helper.mjs generate-test-report /tmp/test_output.log 56
```

---

### 3. **Workflow の改善**

#### ステップ 2.1: Spec 検証ステップを追加

```yaml
- name: Validate generated spec file
  id: validate_spec
  ...
```

**効果**: 不完全な Spec ファイルの早期検出

#### ステップ 2.2: テスト生成にタイムアウトと詳細エラー処理

```bash
timeout 300 npx ts-node scripts/generate-tests-from-spec.ts "$SPEC_FILE"
GEN_STATUS=$?

if [ $GEN_STATUS -ne 0 ]; then
  node scripts/workflow-error-handler.mjs capture-error "TEST_GENERATION_FAILED" ...
  exit 1
fi
```

**効果**: 
- テスト生成の無限ループを防止
- 生成失敗を正確に検出

#### ステップ 2.3: Git Push に retry ロジック

```bash
PUSH_ATTEMPTS=0
PUSH_MAX_ATTEMPTS=3
PUSH_BACKOFF=5

while [ $PUSH_ATTEMPTS -lt $PUSH_MAX_ATTEMPTS ]; do
  if git push origin "$BRANCH_NAME" --no-verify 2>&1 | ...; then
    break
  else
    sleep $PUSH_BACKOFF
  fi
done
```

**効果**: 
- 一時的な Git push 失敗に対応
- 並行実行時の競合を軽減

#### ステップ 2.4: テスト実行結果の詳細検証

```bash
npm test 2>&1 | tee "$TEST_OUTPUT_FILE"
node scripts/test-validation-helper.mjs check-test-output "$TEST_OUTPUT_FILE" 3
```

**効果**: 
- テスト失敗の原因を自動分類
- ユーザーに対して明確な情報提供

#### ステップ 3.1: エラーログの Issue コメント通知

```javascript
- name: Check for workflow errors and post if any
  ...
  // エラーログを読み込み → Issue コメント投稿
```

**効果**: 
- ワークフローログを見なくても Issue コメントで原因確認可能
- ユーザーの負担削減

---

## 🎯 エラーカテゴリと対応

### Critical Errors

| エラー | 原因 | 対応 |
|--------|------|------|
| `SPEC_FILE_EMPTY` | Spec ファイルが生成されていない | Issue の受入条件を確認 |
| `SPEC_FILE_NOT_FOUND` | Spec ファイルが見つからない | 仕様生成ステップのログを確認 |
| `TEST_GENERATION_FAILED` | テストコード生成失敗 | ts-node のエラーメッセージを確認 |
| `GIT_PUSH_FAILED` | ブランチのプッシュ失敗（3回の retry 後） | 権限・ネットワーク確認 |

### High Severity Errors

| エラー | 原因 | 対応 |
|--------|------|------|
| `SPEC_FILE_INVALID_FORMAT` | Spec YAML の形式が不正 | スクリプト出力を確認 |
| `TEST_EXECUTION_FAILED` | テスト実行時にエラー発生 | テスト環境を確認 |
| `PR_CREATION_FAILED` | PR 作成に失敗 | 権限確認 |

### Medium Severity Warnings

| 警告 | 意味 | 対応 |
|------|------|------|
| `NO_E2E_TESTS` | E2E テストが生成されていない | Issue の受入条件形式を確認 |
| `LOW_TEST_COUNT` | テスト数が予期より少ない | Spec ファイルの テスト定義を確認 |

---

## 📊 ログ出力形式

### Error Log File (`/tmp/workflow_errors.json`)

```json
[
  {
    "timestamp": "2026-11-07T06:34:54.062Z",
    "type": "TEST_GENERATION_FAILED",
    "message": "ts-node exited with code 1",
    "context": {
      "issue_number": "56",
      "spec_file": "tests/specs/web.yml"
    },
    "workflowRunId": "42344677471",
    "workflowRunAttempt": "1",
    "workflowJob": "generate-implementation"
  }
]
```

### Issue Comment Format

エラー通知は以下のフォーマットで Issue にコメントされます：

```markdown
## ⚠️ ワークフロー実行エラー

**エラータイプ**: `TEST_GENERATION_FAILED`
**メッセージ**: ts-node exited with code 1
**実行ID**: [42344677471](https://github.com/.../actions/runs/42344677471)

### コンテキスト情報
```json
{
  "issue_number": "56",
  "spec_file": "tests/specs/web.yml"
}
```

### 推奨アクション
1. [ワークフロー実行ログ](https://github.com/.../actions/runs/42344677471) を確認
2. エラー内容に基づいて Issue の受入条件を確認・修正
3. ワークフローを再実行

*このメッセージは自動生成されました*
```

---

## 🚀 Phase 2・3 への展開

### Phase 2: 復旧メカニズム（推奨）

- [ ] ロールバック機能（失敗時の Branch cleanup）
- [ ] 自動リトライ（特定エラー時）
- [ ] タイムアウト設定の細粒度化

### Phase 3: 監視・通知強化（Optional）

- [ ] 段階的な Issue コメント更新（進捗通知）
- [ ] エラーカテゴリ別の推奨アクション表示
- [ ] メトリクス収集（成功率、平均実行時間）

---

## 🧪 テスト方法

### 手動テスト

1. **Spec ファイル検証**
   ```bash
   cd /home/coco/copilot-quality-harness
   node scripts/workflow-error-handler.mjs validate-spec tests/specs/web.yml 56
   # Expected: valid=true
   ```

2. **エラーハンドリング**
   ```bash
   node scripts/workflow-error-handler.mjs validate-spec "" 56
   # Expected: valid=false, error=SPEC_FILE_EMPTY
   ```

3. **テストレポート生成**
   ```bash
   node scripts/test-validation-helper.mjs generate-test-report /tmp/test_output.log 56
   # Expected: Markdown レポート出力
   ```

### ワークフロー内テスト

Issue を手動トリガーで実行し、以下を確認：

1. Spec 検証ステップが正常に完了
2. テスト生成に失敗した場合、詳細エラーが Issue コメントに投稿される
3. Git push 失敗時に 3 回の retry が実行される
4. テスト実行結果が詳細に分類・報告される

---

## 📌 重要なポイント

### 環境変数の受け渡し

**Issue**: ジョブ間での outputs 受け渡しが失敗しやすい

**解決策**:
- Artifact をダウンロード後、ファイル直接確認
- env 変数が空の場合の fallback ロジック
- 複数の場所でファイルを探索（web.yml, tests/specs/web.yml など）

### エラー分類の重要性

**なぜ重要か**: 「No changes generated」という曖昧なメッセージより、「テスト生成失敗」という明確なカテゴリ分類が、ユーザーの問題解決を大幅に加速

**実装**: エラータイプごとに固有の対応方法を提示

### タイムアウトの設定

**理由**: 大規模 Issue でテスト生成が無限ループする可能性

**実装**: ts-node に 300 秒のタイムアウト設定

---

## 💡 今後の改善案

1. **メトリクス収集**
   - ワークフロー成功率の追跡
   - 平均実行時間の監視
   - エラーカテゴリ別の統計

2. **インテリジェント retry**
   - エラータイプに応じた異なる retry 戦略
   - Exponential backoff の実装

3. **ユーザーガイダンス**
   - Issue テンプレートで「受入条件の形式」を明示
   - FAQ ドキュメント作成
   - デバッグガイド

4. **Slack/Discord 通知**
   - 重大エラーを外部チャネルに通知
   - ワークフロー完了時の自動通知

---

## 📚 関連ファイル

- `scripts/workflow-error-handler.mjs` - エラー処理ユーティリティ
- `scripts/test-validation-helper.mjs` - テスト検証・レポート生成
- `.github/workflows/spec-to-implementation.yml` - メインワークフロー
- `WORKFLOW-ERROR-HANDLING.md` - このドキュメント

---

**作成日**: 2026-11-07  
**最終更新**: 2026-11-07
