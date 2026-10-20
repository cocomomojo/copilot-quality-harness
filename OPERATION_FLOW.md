# 🌊 Copilot Quality Harness - 運用フロー完全ガイド

ユーザー視点での完全な「Issue 作成 → テスト設計 → 実装 → テスト実行 → デプロイ」ワークフロー

---

## 📋 全体フロー（ざっくり図）

```mermaid
graph TD
    A["🔵 Issue 作成<br/>acceptance.md"] --> B["📊 Issue 解析<br/>m2-issue-intake.yml"]
    B --> C["🧪 テスト観点・項目生成<br/>generate-quality-items.yml"]
    C --> D["🛠️ 仕様YAML→実装<br/>spec-to-implementation.yml"]
    D --> E["💻 実装 + テストコード<br/>開発者作業"]
    E --> F["✅ テスト実行<br/>test-matrix.yml"]
    F --> G["📈 品質レポート<br/>quality-report-pr.yml"]
    G --> H["🤖 Copilot AI Review<br/>ai-review.yml"]
    H --> I["🔀 PR マージ判定<br/>人間がレビュー"]
    I --> J["🚀 Pages デプロイ<br/>自動デプロイ"]
    
    style A fill:#e1f5ff
    style B fill:#f3e5f5
    style C fill:#fff3e0
    style D fill:#e8f5e9
    style E fill:#fce4ec
    style F fill:#f1f8e9
    style G fill:#ede7f6
    style H fill:#e0f2f1
    style I fill:#fff9c4
    style J fill:#c8e6c9
```

---

## 🔷 ステップ 1: Issue 作成

### ユーザーの操作

1. **GitHub UI から Issue 作成**
   ```
   Issues → New Issue → Acceptance Test Template を選択
   ```

2. **Issue テンプレート（`.github/ISSUE_TEMPLATE/acceptance.md`）**
   ```markdown
   ## 📝 概要
   What should the system do?
   
   ## ✅ 受け入れ基準（Acceptance Criteria）
   - Criteria 1
   - Criteria 2
   
   ## 🧪 テスト観点（Test Perspectives）
   - Functionality: ...
   - Usability: ...
   - Security: ...
   
   ## 📌 関連リソース
   - Related issues: #xxx
   ```

3. **Issue サンプル**
   ```
   [Issue #100] User Registration Flow
   
   📝 概要: 
   ユーザーが新規登録できる機能が必要
   
   ✅ 受け入れ基準:
   - Email 入力フィールドがある
   - パスワード検証ルール（8文字以上）
   - 送信ボタンが動作する
   - 成功時にメール送信される
   
   🧪 テスト観点:
   - Functionality: Email validation, Password validation
   - Security: SQL injection prevention, XSS prevention
   - Usability: Error messages in Japanese
   ```

---

## 📊 ステップ 2: Issue 自動解析（M2 Issue Intake）

### 自動トリガー（オプション）または手動トリガー

**方法 A: 手動トリガー**
```bash
gh workflow run m2-issue-intake.yml \
  -f issue_number=100
```

**方法 B: GitHub UI**
- Actions → M2 Issue Intake → Run workflow → Issue 番号を入力

### ワークフロー: `m2-issue-intake.yml` ⚡

実行内容:
- Issue コンテンツを読み込み
- リポジトリ構造を自動分析
- テスト設計YAML テンプレを生成
- 出力ファイルを PR コメントに投稿

### 出力例

```json
{
  "issue_number": 100,
  "title": "User Registration Flow",
  "acceptance_criteria": [
    { "id": "AC-1", "description": "Email input field exists" },
    { "id": "AC-2", "description": "Password validation rules (8+ chars)" }
  ],
  "test_perspectives": [
    { "name": "Functionality", "items": ["Email validation", "Password validation"] },
    { "name": "Security", "items": ["SQL injection prevention", "XSS prevention"] }
  ],
  "suggested_spec_yaml": "# Generated specification in YAML format..."
}
```

---

## 🧪 ステップ 3: テスト観点・項目生成

### 自動生成による テスト観点・項目の定義

**方法 A: 手動トリガー（推奨）**
```bash
gh workflow run generate-quality-items.yml \
  -f mode=detailed
```

**方法 B: GitHub UI**
- Actions → Generate Quality Items → Run workflow
- Mode を選択: `simple` または `detailed`

### ワークフロー: `generate-quality-items.yml` 🎯

実行内容:
- ISO/IEC 25010 品質特性に基づいてテスト観点を生成
- 機能性、信頼性、セキュリティなど複数の観点を自動生成
- JSON + YAML 形式で出力

### 出力例

```yaml
# qa/quality-characteristics/generated/test-perspectives.yml

quality_characteristics:
  - name: Functionality
    perspectives:
      - test_id: "F-001"
        title: "Email Validation"
        description: "Valid and invalid email formats are properly handled"
        test_cases:
          - "Valid email: user@example.com"
          - "Invalid email: user@example (missing domain)"
          - "Edge case: user+tag@example.co.uk"
  
  - name: Security
    perspectives:
      - test_id: "S-001"
        title: "SQL Injection Prevention"
        description: "SQL injection attacks are prevented"
        test_cases:
          - "Input: ' OR '1'='1"
          - "Input: '; DROP TABLE users; --"
```

---

## 🛠️ ステップ 4: 仕様 YAML → 実装 + テストコード自動生成

### ワークフロー: `spec-to-implementation.yml` 🔧

**事前準備**
```bash
# テスト仕様 YAML を作成
# tests/specs/user-registration.yml

feature: User Registration
description: Complete user registration flow
tests:
  unit_tests:
    - id: "UT-001"
      title: "Email validation"
      category: "validation"
      input: { email: "test@example.com" }
      expected_output: { valid: true }
    
    - id: "UT-002"
      title: "Invalid email rejection"
      category: "validation"
      input: { email: "invalid-email" }
      expected_output: { valid: false, error: "Invalid email" }
  
  e2e_tests:
    - id: "E2E-001"
      title: "User can register successfully"
      steps:
        - step_id: 1
          action: navigate
          target: "/register"
        - step_id: 2
          action: fill
          target: '[data-test="email-input"]'
          value: "user@example.com"
        - step_id: 3
          action: click
          target: '[data-test="submit-btn"]'
        - step_id: 4
          action: assert_text
          target: '[data-test="success-message"]'
          expected: "Registration successful"
```

**手動トリガー**
```bash
gh workflow run spec-to-implementation.yml \
  -f spec_file='tests/specs/user-registration.yml'
```

### ワークフロー実行内容

1. **仕様 YAML 読み込み**
2. **UT コード自動生成** → `src/tests/unit/user-registration.spec.ts`
3. **E2E テストコード生成** → `e2e/user-registration.spec.ts`
4. **モック定義生成** → `tests/fixtures/mocks.ts`
5. **PR 作成** → ブランチ: `feature/spec-generated-tests-{timestamp}`

### 生成されるファイル例

**UT コード** (`src/tests/unit/user-registration.spec.ts`):
```typescript
import { validateEmail } from '../src/auth';

describe('Email Validation', () => {
  test('UT-001: Valid email is accepted', () => {
    const result = validateEmail('test@example.com');
    expect(result).toEqual({ valid: true });
  });

  test('UT-002: Invalid email is rejected', () => {
    const result = validateEmail('invalid-email');
    expect(result).toEqual({ 
      valid: false, 
      error: 'Invalid email' 
    });
  });
});
```

**E2E テストコード** (`e2e/user-registration.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';

test.describe('User Registration', () => {
  test('E2E-001: User can register successfully', async ({ page }) => {
    await page.goto('http://localhost:3000/register');
    await page.locator('[data-test="email-input"]').fill('user@example.com');
    await page.locator('[data-test="submit-btn"]').click();
    await expect(page.locator('[data-test="success-message"]'))
      .toContainText('Registration successful');
  });
});
```

---

## 💻 ステップ 5: 開発者による実装

### 開発者の作業内容

1. **生成された PR をチェック**
   ```bash
   git checkout feature/spec-generated-tests-{timestamp}
   ```

2. **生成されたテストコードを確認**
   ```bash
   npm run test  # UT を実行
   npm run test:e2e  # E2E テストを実行（まだ失敗するはず）
   ```

3. **実装を完成させる**
   ```bash
   # src/auth.ts を実装して、テストをパスさせる
   ```

4. **ローカルで検証**
   ```bash
   npm run test  # すべての UT がパス
   npm run test:e2e  # すべての E2E テストがパス
   npm run lint  # コード品質チェック
   ```

5. **PR を main へマージ提案**
   ```bash
   git add .
   git commit -m "feat: implement user registration flow"
   git push origin feature/spec-generated-tests-{timestamp}
   ```

---

## ✅ ステップ 6: テスト実行と品質検証

### 自動トリガー: PR 作成時

**ワークフロー: `test-matrix.yml`** 🚀

実行内容:
- Node 18/20 上で テスト実行
- 最大 8 並列マトリックス（異なるテスト種別）
- UT + E2E テスト実行
- テストカバレッジ収集

```yaml
# ワークフローの matrix 戦略
matrix:
  node-version: [18, 20]
  test-type: [unit, e2e, integration]
# 結果: 6 並列ジョブ（2 × 3）
```

### 出力アーティファクト

```json
{
  "test-results-node18-unit.json": { "passed": 45, "failed": 0, "duration": "2.3s" },
  "test-results-node18-e2e.json": { "passed": 12, "failed": 0, "duration": "15.4s" },
  "test-results-node20-unit.json": { "passed": 45, "failed": 0, "duration": "2.1s" },
  "coverage-summary.json": { "lines": 92, "branches": 85, "functions": 90 }
}
```

---

## 📈 ステップ 7: 品質レポート生成と PR コメント

### ワークフロー: `quality-report-pr.yml`

**トリガー**: `test-matrix.yml` 完了時（workflow_run）

実行内容:
1. テスト結果アーティファクト ダウンロード
2. 結果を集約・整理
3. PR コメント生成
4. PR にコメント投稿

### PR コメント例

```markdown
## ✅ Quality Report

### Test Results
| Test Type | Node 18 | Node 20 | Status |
|-----------|---------|---------|--------|
| Unit Tests | ✅ 45/45 | ✅ 45/45 | PASS |
| E2E Tests | ✅ 12/12 | ✅ 12/12 | PASS |

### Coverage
- Lines: 92% (target: 80%) ✅
- Branches: 85% (target: 75%) ✅
- Functions: 90% (target: 80%) ✅

### Performance
- UT Duration: 2.1-2.3s
- E2E Duration: 15.4s
- Total: ~30s (8 parallel jobs)

### Recommendations
- No issues detected ✅
- Ready to merge
```

---

## 🤖 ステップ 8: Copilot AI Review

### ワークフロー: `ai-review.yml`

**トリガー**: PR 作成時

実行内容:
1. 変更ファイル・diff を分析
2. セキュリティリスク検出
3. テストカバレッジギャップ検出
4. 最適化提案生成
5. PR に AI コメント投稿

### AI コメント例

```markdown
## 🤖 AI Code Review

### Security Analysis
- ✅ SQL injection risk: Not detected
- ✅ XSS vulnerability: Not detected
- ⚠️ CORS policy: Needs review (added Access-Control-Allow-Origin header)

### Performance
- ✅ Algorithm complexity: O(n) - acceptable
- ⚠️ Database queries: Consider caching for repeated lookups

### Test Coverage
- ✅ New code coverage: 92% (exceeds 80% target)
- ⚠️ Edge cases: Missing test for empty email input

### Recommendations
1. Add test case for empty email string: `validateEmail("")`
2. Consider memoizing email validation regex for performance

**Confidence**: 8.5/10
```

---

## 🔀 ステップ 9: PR マージ判定（人間レビュー）

### レビュアーのチェックリスト

```markdown
## マージ前チェックリスト

- [ ] コード品質
  - [ ] Lint パス
  - [ ] セキュリティ警告なし
  - [ ] AI Review 確認

- [ ] テスト
  - [ ] UT すべてパス
  - [ ] E2E すべてパス
  - [ ] カバレッジ基準達成（80%+）

- [ ] ドキュメント
  - [ ] README 更新（必要な場合）
  - [ ] CHANGELOG 更新

- [ ] パフォーマンス
  - [ ] テスト実行時間が合理的範囲
  - [ ] E2E 実行時間が許容範囲

- [ ] ビジネス
  - [ ] 要件を満たしている
  - [ ] 受け入れ基準すべて達成
  - [ ] 既存機能への影響なし
```

### マージ判定基準

| 項目 | 条件 |
|------|------|
| **テスト結果** | 全テストパス（Node 18/20 両方） |
| **カバレッジ** | Lines 80% 以上、Branches 75% 以上 |
| **AI Review** | セキュリティ: Low 以下、スタイル: 承認可 |
| **人間レビュー** | 最低 1 人の承認 |
| **自動マージ** | **なし**（必ず手動マージ） |

---

## 🚀 ステップ 10: Pages デプロイ（自動）

### トリガー: main ブランチへのマージ時

**ワークフロー**: GitHub Pages デプロイ（別途カスタマイズ）

実行内容:
1. ビルド実行
   ```bash
   npm run build
   ```

2. デプロイアーティファクト生成

3. GitHub Pages にデプロイ

### デプロイ確認

```bash
# Pages URL
https://cocomomojo.github.io/copilot-quality-harness/

# ダッシュボード（自動生成）
https://cocomomojo.github.io/copilot-quality-harness/dashboard.html
```

---

## 📊 ワークフロー相互関係マッピング表

| # | ワークフロー | トリガー | 入力 | 出力 | 次ステップ | 依存 |
|---|------------|---------|------|------|-----------|------|
| 1 | m2-issue-intake | Manual（workflow_dispatch） | Issue # | M2 Report JSON | generate-quality-items | - |
| 2 | generate-quality-items | Manual（workflow_dispatch） | Mode | Quality Items YAML/JSON | Manual: spec-to-implementation | - |
| 3 | spec-to-implementation | Manual / Cron | Spec YAML | UT/E2E/Mock コード + PR | test-matrix（自動） | - |
| 4 | test-matrix | PR / Push | コード | test-results-*.json | quality-report-pr | - |
| 5 | quality-report-pr | workflow_run（test-matrix 完了） | Artifacts | PR コメント | ai-review（自動） | test-matrix |
| 6 | ai-review | PR created/sync | PR diff | AI コメント | Manual: PR マージ | - |
| 7 | auto-code-review | PR | コード | Lint/Style コメント | Manual: PR マージ | - |
| 8 | (Manual Merge) | Manual | PR | - | Pages デプロイ | ai-review + 人間承認 |
| 9 | Pages Deploy | Push to main | ビルド成果物 | Pages URL | - | main ブランチ |
| 10 | quality-schedule | Cron（毎週金曜 5:00 JST） | - | 週次品質レポート | Dashboard 更新 | - |
| 11 | copilot-analyze-trace | Manual / PR | trace.zip | 分析 + Draft PR | Manual: PR マージ | - |

---

## 🎯 デフォルト・推奨運用フロー（3 パターン）

### パターン A: 標準的な機能開発（推奨）

```
1. Issue 作成（acceptance.md）
   ↓
2. m2-issue-intake 実行（手動）
   ↓
3. generate-quality-items 実行（手動）→ テスト観点確認
   ↓
4. テスト仕様 YAML 作成/修正
   ↓
5. spec-to-implementation 実行（手動）→ PR 作成
   ↓
6. 開発者: ローカルで実装 + テスト確認
   ↓
7. test-matrix（自動）→ quality-report-pr（自動）
   ↓
8. ai-review（自動）で AI コメント確認
   ↓
9. 人間レビュー → マージ（手動）
   ↓
10. Pages デプロイ（自動）
```

### パターン B: ホットフィックス（高速）

```
1. Issue 作成（簡潔）
   ↓
2. 開発者: 直接実装
   ↓
3. PR 作成 → test-matrix（自動）
   ↓
4. ai-review（自動）
   ↓
5. 迅速レビュー + マージ（手動）
   ↓
6. Pages デプロイ（自動）
```

### パターン C: テスト失敗分析（Trace ベース）

```
1. E2E テスト失敗 → trace.zip 生成
   ↓
2. copilot-analyze-trace 実行（手動/自動）
   ↓
3. Copilot が修正案生成 → Draft PR
   ↓
4. 人間レビュー → 修正実装
   ↓
5. test-matrix（自動）
   ↓
6. マージ（手動）
```

---

## 💡 ベストプラクティス

### ✅ DO

- **Issue は詳しく書く**: テスト観点・受け入れ基準を含める
- **テスト仕様 YAML を活用**: 自動生成に活かせる
- **AI コメントをレビュー**: セキュリティ観点をチェック
- **マージ前チェックリストを確認**: 品質基準達成を確認
- **週次スケジュール実行**: quality-schedule.yml で品質監視

### ❌ DON'T

- **AI コメントだけでマージしない**: 人間レビューは必須
- **テスト不要と判断しない**: 自動生成テストだけでなく、追加の検証も検討
- **自動マージに頼らない**: すべて手動マージ
- **アーティファクト受け渡しを無視しない**: workflow_run の設定を確認
- **PII（個人情報）を含める**: pii-filter.ts で自動除去

---

## 🔍 トラブルシューティング

### Q: test-matrix が実行されない

**A**: 以下を確認
```yaml
# .github/workflows/test-matrix.yml の on: セクション
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
```

### Q: quality-report-pr のコメントが投稿されない

**A**: workflow_run の設定確認
```yaml
on:
  workflow_run:
    workflows: ["Test Matrix"]  # 正確なワークフロー名
    types: [completed]
```

### Q: Pages デプロイが失敗する

**A**: リポジトリ設定確認
- Settings → Pages → Source: GitHub Actions に設定
- ブランチ保護ルールが main ブランチに適用されているか確認

---

## 📚 関連ドキュメント

- [WORKFLOWS_GUIDE.md](./WORKFLOWS_GUIDE.md) — 各ワークフロー詳細
- [.github/skills/](./github/skills/) — Copilot Skills 定義
- [QA_POLICY.md](./QA_POLICY.md) — 品質ポリシー
- [README.md](./README.md) — システム概要

---

**Version**: 1.0  
**Last Updated**: 2026-10-20  
**Maintainer**: copilot-quality-team
