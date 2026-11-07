# E2E Test Auto-Healing Loop (AIエージェント統合)

## 概要

**自己改善ループ** - 「テスト生成 → 実行 → 失敗分析 → **AI自動修復** → 再実行」をAIエージェント（Copilot）が自動実行

```
Issue作成
    ↓
M2 Issue Intake ワークフロー
    ↓
Spec-to-Implementation ワークフロー
    ├─ 実装・テスト自動生成
    └─ E2Eテスト実行
        ├─ ✅ 成功 → PR作成
        └─ ❌ 失敗
            ↓
E2E Auto-Healing Agent ワークフロー
    ├─ 親ワークフローのE2E失敗を検出
    ├─ 🤖 Copilot AIエージェント起動
    │  ├─ 失敗パターン分析
    │  ├─ セレクタ/タイムアウト/アサーション修正提案
    │  ├─ テストファイル自動修復
    │  └─ 修復の検証（再実行）
    ├─ 修復成功 → コミット・プッシュ
    └─ PR にレポート追加
        ↓
      完成した PR → マージ
```

## 関連ファイル

### スクリプト

- **scripts/e2e-auto-healing-loop.mjs**
  - メインの自動修復ロジック
  - コマンド: `node e2e-auto-healing-loop.mjs heal-with-agent <issue_num>`
  - 機能：
    1. E2Eテスト実行・失敗検出
    2. 失敗パターン分析
    3. AI修復タスク生成
    4. テストファイル修復
    5. テスト再実行・検証
    6. 成功時はコミット

### ワークフロー

- **.github/workflows/spec-to-implementation.yml** (修正)
  - テスト失敗時に `ai_healer` ステップを実行
  - E2E Auto-Healing Agent ワークフローをトリガー

- **.github/workflows/e2e-auto-healing-agent.yml** (新規)
  - 親ワークフロー失敗時に自動起動
  - Copilot AI エージェントを呼び出し
  - 修復結果を PR にコメント

## 修復対象エラー

### 1. SELECTOR_NOT_FOUND
- **現象**: `Timeout waiting for selector "xxx"`
- **修復**: 代替セレクタ提案
  ```javascript
  // Before
  await page.click('button.submit');
  
  // After
  await page.click('[data-testid="submit-button"]');
  ```

### 2. NAVIGATION_TIMEOUT
- **現象**: `page.goto() Timeout`
- **修復**: waitUntil オプション追加
  ```javascript
  // Before
  await page.goto(url);
  
  // After
  await page.goto(url, { waitUntil: 'networkidle' });
  ```

### 3. ASSERTION_FAILED
- **現象**: `Expected "X" but received "Y"`
- **修復**: アサーションロジック見直し
  ```javascript
  // Before
  expect(text).toEqual('exact text');
  
  // After
  expect(text).toContain('partial match');
  ```

### 4. NETWORK_ERROR
- **現象**: `net::ERR_*` Network failures
- **修復**: リトライロジック追加
  ```javascript
  // Before
  await page.goto(url);
  
  // After
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForResponse(resp => resp.ok());
  ```

## ワークフロー実行フロー

### Issue #61 作成時の例

```bash
1. Issue #61 "Frontend ページ遷移" 作成
   ↓
2. M2 Issue Intake → frontend.yml 自動生成
   ↓
3. Spec-to-Implementation 実行
   - 7ページコンポーネント生成
   - UT・E2E テスト生成
   - npm test 実行
   ├─ ✅ All pass → PR #62 作成完了
   └─ ❌ E2E fail
      ↓
4. E2E Auto-Healing Agent トリガー
   - e2e-auto-healing-loop.mjs 実行
   - 失敗パターン分析
   - セレクタ/タイムアウト修正
   - npm test 再実行
   ├─ ✅ All pass → コミット・PR更新
   └─ ❌ Still fail → 手動レビュー促す
   ↓
5. PR コメント追加
   "🤖 AI Auto-Healing Report
    ✅ E2E tests auto-healed by AI agent"
```

## 使用方法

### 手動テスト（開発時）

```bash
# E2E テスト実行 → 失敗自動修復 → 再実行
node scripts/e2e-auto-healing-loop.mjs heal-with-agent 61

# ヘルプ表示
node scripts/e2e-auto-healing-loop.mjs help
```

### ワークフロー自動実行

1. Issue を作成（受入条件あり）
2. M2 Issue Intake が自動実行
3. Spec-to-Implementation が自動実行
4. E2E失敗時に E2E Auto-Healing Agent が自動実行

### 修復ロジック追加

**scripts/e2e-auto-healing-loop.mjs** の `parseTestFailures()` 関数に新しいパターンを追加：

```javascript
// TIMEOUT_TO_SELECTOR_NOT_FOUND
if (line.includes('waitForSelector') && line.includes('timeout')) {
  failures.push({
    type: 'SELECTOR_WAIT_TIMEOUT',
    context: lines.slice(Math.max(0, i - 3), i + 5).join('\n')
  });
}
```

## トラブルシューティング

### AI修復が実行されない
1. 親ワークフロー (spec-to-implementation.yml) が失敗したか確認
2. ブランチ名が `copilot/impl-issue-*` パターンか確認
3. ワークフロー実行ログで `e2e-auto-healing-agent.yml` トリガーを確認

### 修復後も テストが失敗する場合
1. ワークフロー上の AI 修復ログを確認
2. PR コメントの修復レポートを確認
3. テストログで失敗原因を特定
4. 手動修正が必要な場合は PR で手直し

### 修復ログの確認
```bash
# ローカルで実行時のログ確認
cat /tmp/healer_output.log
cat /tmp/ai_agent_output.log

# GitHub Actions 上のログ
# Workflows → e2e-auto-healing-agent.yml → 最新実行 → ログ確認
```

## 今後の拡張

### Phase 1 (現在実装済み)
- ✅ E2Eテスト自動実行・失敗検出
- ✅ エラーパターン分析
- ✅ 基本的な修復提案

### Phase 2 (検討中)
- [ ] Playwright Inspector 統合
- [ ] ビジュアル検証（スクリーンショット比較）
- [ ] フレーク対応（リトライ戦略）

### Phase 3 (将来)
- [ ] 機械学習による修復パターン学習
- [ ] テスト品質スコア追跡
- [ ] セルフ改善の最適化
