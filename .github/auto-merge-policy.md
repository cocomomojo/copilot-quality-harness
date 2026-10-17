# 自動マージ条件ポリシー

**最終更新**: 2026-10-17  
**責任者**: Copilot Quality Team  

---

## 概要

このドキュメントは、GitHub Actions 自動マージワークフローが実行される条件と、運用上のガードレールを定義します。

**基本原則**：
- ✅ **低リスク変更のみ自動マージ**（ドキュメント、フォーマット、lint 修正）
- ❌ **E2E テストは自動マージ対象外**（Draft PR 必須）
- ⚠️  **セキュリティ関連変更は常に人間確認**
- 📊 **全自動マージを監査ログで記録**

---

## 1. 自動マージ許可条件（チェックリスト）

### 1.1 変更内容の判定

| # | 条件 | チェック方法 | 自動マージ可 |
|---|------|------------|----------|
| **1** | **変更タイプ**：ドキュメント・フォーマット・lint修正のみ | `git diff --name-only` で拡張子確認 | ✅ はい |
| **2** | 実装コード（`.js`, `.ts`, `.jsx`, `.tsx`）の変更を含む | 同上 | ❌ いいえ |
| **3** | 外部API・スキーマ・認証関連の変更 | ファイル内容チェック | ❌ いいえ |
| **4** | 設計方針・アーキテクチャの変更 | Issue/PR 説明文チェック | ❌ いいえ |

**対象ファイル（自動マージ許可）：**
```
*.md, *.yml, *.yaml, *.json (config), .gitignore, .eslintignore, 
package.json (dependencies のみ、かつ脆弱性チェック済み)
```

**除外ファイル（自動マージ禁止）：**
```
**/*.js, **/*.ts, **/*.jsx, **/*.tsx, src/**, backend/**, frontend/**,
.env*, secrets.*, keys.*, private.**
```

---

### 1.2 コード品質チェック（必須）

| # | チェック項目 | ツール | 合格条件 | 必須か |
|---|------------|--------|---------|--------|
| **1** | **Lint / Format** | ESLint + Prettier | エラー 0、警告 0 | ✅ 必須 |
| **2** | **型チェック** | TypeScript (`strict: true`) | エラー 0 | ✅ 必須 |
| **3** | **SAST** | CodeQL / ESLint security | 重大 0、高リスク 0 | ✅ 必須 |
| **4** | **依存脆弱性** | Dependabot / npm audit | 重大 0、高リスク 0 | ✅ 必須 |
| **5** | **ユニットテスト** | Jest / Mocha | 全テスト合格、カバレッジ 90%↑ | ✅ 必須 |
| **6** | **E2E テスト** | Playwright | ❌ 自動マージ対象外（Draft PR 必須） | ❌ 不可 |

---

### 1.3 監査・変更管理チェック

| # | 項目 | 基準 |
|---|------|------|
| **1** | **PR テンプレ記載** | 「本 PR は自動マージ条件を満たします」チェックボックス ☑ |
| **2** | **Copilot 提案フラグ** | PR に `copilot-suggestion` ラベル付与 |
| **3** | **監査ログ記録** | `analysis.json` に以下を記載：<br/>- `pr_hash`: 変更内容のハッシュ<br/>- `model_version`: 使用 Copilot モデル<br/>- `generated_at`: 生成日時<br/>- `merged_at`: マージ実行日時<br/>- `merged_by`: `github-actions[bot]` |
| **4** | **タイムスタンプ記録** | PR 作成から自動マージまでの経過時間を監査ログに記録 |

---

## 2. CI パイプラインの実行順序

```
┌─────────────────────────────────────────────────────────────┐
│                   Pull Request Created                       │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────▼───────────────┐
          │   1. Lint & Format Check     │
          │   (ESLint + Prettier)        │
          └──────────────┬───────────────┘
                         │
          ┌──────────────▼───────────────┐
          │   2. Type Check              │
          │   (TypeScript strict)        │
          └──────────────┬───────────────┘
                         │
          ┌──────────────▼───────────────┐
          │   3. SAST Security Check     │
          │   (CodeQL)                   │
          └──────────────┬───────────────┘
                         │
          ┌──────────────▼───────────────┐
          │   4. Dependency Scan         │
          │   (Dependabot)               │
          └──────────────┬───────────────┘
                         │
          ┌──────────────▼───────────────┐
          │   5. Unit Test Execution     │
          │   (Jest, Mocha)              │
          └──────────────┬───────────────┘
                         │
          ┌──────────────▼───────────────┐
          │   6. Coverage Check          │
          │   (90% 以上)                 │
          └──────────────┬───────────────┘
                         │
          ┌──────────────▼───────────────┐
          │   7. Auto-Merge Decision     │
          │   (この doc の条件で判定)     │
          └──────────┬───────┬───────────┘
                     │       │
          ✅ 合格    │       │    ❌ 失敗
          (APPROVED) │       │  (CHANGES_REQUESTED)
                     │       │
         ┌───────────▼┐    ┌─▼───────────────┐
         │   MERGE    │    │  Create Draft   │
         │ (Auto Bot) │    │  PR for Review  │
         └────────────┘    └─────────────────┘
```

---

## 3. 自動マージ実行ルール

### 3.1 マージ実行タイミング

| 項目 | ルール |
|------|--------|
| **実行タイミング** | 全 CI チェック合格から 5 分後（人間検査の猶予時間） |
| **タイムアウト** | PR 作成から 30 分以内（それ以降は人間レビューを要求） |
| **同時マージ数** | 最大 1 並行（シーケンシャル） |
| **マージコミット** | `Squash and merge` で単一コミットに |

### 3.2 マージ前の最終チェック

自動マージ実行直前に、以下の確認をコード実行で検証：

```typescript
// pseudo-code: auto-merge-decision.mjs の logic
function canAutoMerge(pr: PullRequest): boolean {
  // ✅ チェック 1: 変更ファイルタイプ確認
  const files = pr.files.map(f => f.name);
  if (!files.every(isDocOrConfigFile)) return false;

  // ✅ チェック 2: 全 CI チェック合格
  if (!pr.checks.every(c => c.status === 'SUCCESS')) return false;

  // ✅ チェック 3: セキュリティ関連フラグなし
  if (pr.labels.includes('security-review-required')) return false;

  // ✅ チェック 4: Copilot 提案フラグ確認
  if (!pr.labels.includes('copilot-suggestion')) return false;

  // ✅ チェック 5: UT/E2E 失敗なし
  if (pr.testResults.failureCount > 0) return false;

  // ✅ チェック 6: カバレッジ低下なし
  if (pr.coverage.current < pr.coverage.base) return false;

  return true;
}
```

---

### 3.3 マージ後の監視（自動ロールバック）

| 項目 | ルール |
|------|--------|
| **監視期間** | マージから 30 分間 |
| **監視対象** | 本番環境 CI ログ、エラーレート |
| **ロールバック条件** | 重大エラー（P0）が 3 件以上、または エラーレート > 5% |
| **ロールバック方法** | 自動で revert commit を作成し、新 PR を作成（人間承認必須） |

---

## 4. 禁止事項（ガードレール）

### 4.1 自動マージ禁止なパターン

| パターン | 理由 | 対応 |
|---------|------|------|
| **External API/Service 変更** | 下流システムへの影響が予測困難 | 常に人間レビュー（Draft PR） |
| **Database Schema 変更** | 既存データとの互換性リスク | 常に人間レビュー + 移行計画 |
| **Authentication/Authorization 変更** | セキュリティ侵害リスク | CTO 承認必須 |
| **環境変数・設定変更** | 本番環境への予期しない影響 | 環境ごとの検証後に人間マージ |
| **依存ライブラリのメジャーバージョン更新** | 破壊的変更の可能性 | 互換性テスト後に人間マージ |
| **3rd Party Lib の削除** | 影響箇所が隠れている可能性 | grep/検索で使用箇所確認後に人間マージ |

### 4.2 エスカレーションルール

以下の場合は **即座に人間通知** し、ブロック：

- 自動マージ試行で例外発生
- PR が 1 時間以上マージできない状態が継続
- マージ後 5 分以内に P0 アラート発生
- 監査ログハッシュが一致しない（改ざん検知）

---

## 5. 監査ログと記録

### 5.1 記録対象（全自動マージ）

各自動マージイベント時に、以下を `analysis.json` に追記：

```json
{
  "auto_merge_event": {
    "pr_number": 123,
    "pr_title": "docs: update README",
    "pr_files": ["README.md"],
    "pr_hash": "abc123def...",
    "model_version": "claude-3.5-sonnet",
    "decision_at": "2026-10-17T10:30:00Z",
    "decision_reason": "Document update only, all checks passed",
    "merged_at": "2026-10-17T10:35:12Z",
    "merged_by": "github-actions[bot]",
    "merge_commit": "a1b2c3d...",
    "checks_passed": [
      "lint",
      "type-check",
      "sast",
      "dependency-scan",
      "unit-test"
    ],
    "coverage": {
      "before": 87.5,
      "after": 87.5,
      "delta": 0.0
    },
    "status": "SUCCESS"
  }
}
```

### 5.2 監査ログの可視化

- **ログ保管場所**: `.github/audit/auto-merge-log.jsonl`（Line-delimited JSON）
- **保管期間**: 180 日間
- **アクセス権**: リポジトリ Admin のみ
- **定期レポート**: 週次で自動マージ採用率・成功率を報告

---

## 6. KPI と合格ライン

### 6.1 測定指標

| KPI | 目標値 | 警告閾値 | 報告頻度 |
|-----|--------|---------|---------|
| **自動マージ成功率** | 95% | 85% | 日次 |
| **マージ後ロールバック率** | < 1% | > 3% | 日次 |
| **UT カバレッジ** | 90% | 85% | PR ごと |
| **セキュリティ脆弱性検出** | 0 件 | >= 1 件 | 日次 |
| **フレーク率（E2E）** | < 2% | > 5% | 日次 |
| **自動マージ実行数** | - | - | 週次 |

### 6.2 閾値超過時の対応

| 閾値 | トリガー | 対応 |
|-----|---------|------|
| **自動マージ成功率 < 85%** | 連続 3 日間 | 自動化を一時停止、人間レビュー再開 |
| **セキュリティアラート >= 1** | リアルタイム | 即座に CI ブロック、セキュリティチーム通知 |
| **ロールバック率 > 3%** | 日次集計後 | 原因調査、自動化パラメータ調整 |
| **カバレッジ低下 > 2%** | PR ごと | そのマージをブロック |

---

## 7. 有効化・無効化方法

### 7.1 自動マージの有効化

自動マージを有効化するには、リポジトリ Admin が以下を実施：

1. **GitHub Settings** → **Branch protection rules**
2. 「Require status checks to pass before merging」を有効化
3. 「Require branches to be up to date before merging」を有効化
4. **Secrets** に `AUTO_MERGE_ENABLED=true` を追加
5. `.github/workflows/auto-merge.yml` を有効化

### 7.2 一時無効化

緊急時の一時停止：

```bash
# 環境変数で無効化（即反映）
gh secret set AUTO_MERGE_ENABLED --body "false"

# または Workflow を手動で disable
gh workflow disable auto-merge.yml
```

---

## 8. よくある質問（FAQ）

### Q1: 「低リスク」の定義は？
**A**: このドキュメント Section 1.1 の対象ファイルに限定されます。実装コード（`.js/.ts`）の変更は含まれません。

### Q2: 自動マージ後に不具合が見つかった場合は？
**A**: 自動で revert commit が作成され、新 PR が生成されます。その PR は Draft 状態で、人間レビューを待ちます。

### Q3: Copilot 提案でない変更は自動マージできる？
**A**: いいえ。`copilot-suggestion` ラベルが必須です。人間作成の PR は常に Draft PR として作成されます。

### Q4: E2E テストが失敗したら？
**A**: 自動マージはスキップ。Draft PR が作成されて人間レビューを待ちます。

### Q5: カバレッジが 89% だったら？
**A**: 目標値 90% に達していないため、自動マージ不可。人間が原因を調査し、修正後に再実行。

---

## 9. 関連ドキュメント・スクリプト

- [`.github/ISSUE_TEMPLATE/acceptance.md`](./../ISSUE_TEMPLATE/acceptance.md) - 仕様テンプレ
- [`tests/specs/acceptance-example.yml`](../../tests/specs/acceptance-example.yml) - テスト設計テンプレ
- [`scripts/pii-filter.ts`](../../scripts/pii-filter.ts) - PII フィルタ
- [`scripts/merge-decision-check.mjs`](../../scripts/merge-decision-check.mjs) - 自動マージ判定スクリプト
- [`.github/workflows/auto-merge.yml`](./../workflows/auto-merge.yml) - 自動マージワークフロー

---

## 10. 変更履歴

| 日付 | 変更内容 | 責任者 |
|------|--------|--------|
| 2026-10-17 | 初版作成 | Copilot Quality Team |

---

**このドキュメントは 6 ヶ月ごとに見直され、必要に応じて更新されます。**
