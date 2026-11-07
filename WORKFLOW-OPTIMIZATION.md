# ワークフロー最適化ガイド

## 概要

GitHub Actions ワークフロー の **トリガー条件を最適化** し、必要な時だけ実行されるように改善しました。

これにより、以下が実現します：
- ✅ **アクション実行時間を削減** → 不要な再実行を回避
- ✅ **ログやアーティファクト生成コストを削減**
- ✅ **リソース効率を向上** → ストレージ・CPU使用量削減

---

## 実装済み最適化

### 1. Test Matrix ワークフロー

**ファイル**: `.github/workflows/test-matrix.yml`

**変更内容**:
```yaml
on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - 'frontend/**'
      - 'scripts/**'
      - 'package*.json'
      - '.github/workflows/test-matrix.yml'
  pull_request:
    paths:
      - 'backend/**'
      - 'frontend/**'
      - 'scripts/**'
      - 'package*.json'
      - '.github/workflows/test-matrix.yml'
  workflow_dispatch:
```

**トリガー条件**:
- ✅ `backend/` 配下に変更あり
- ✅ `frontend/` 配下に変更あり
- ✅ `scripts/` 配下に変更あり
- ✅ `package.json` または `package-lock.json` に変更あり
- ✅ ワークフロー自体に変更あり（トリガー推移防止）
- ✅ 手動実行 (`workflow_dispatch`)

**トリガーされない場合**:
- ❌ ドキュメント（README.md等）のみ変更
- ❌ CI/CD 設定ファイル（workflow 以外）のみ変更
- ❌ `.gitignore` など設定ファイルのみ変更

**効果**: テスト・実装が変わらない場合、テストスイートが実行されない

---

### 2. Quality Report PR ワークフロー

**ファイル**: `.github/workflows/quality-report-pr.yml`

**変更内容**:
```yaml
on:
  workflow_run:
    workflows: ["Test Matrix"]
    types: [completed]
    conclusions: ["success"]  # ← 追加: 成功時のみ
```

**トリガー条件**:
- ✅ Test Matrix ワークフロー **成功時** のみ実行
- ❌ Test Matrix が **失敗** した場合は実行されない

**効果**: 
- テスト失敗時に不要な PR 生成処理を実行しない
- エラー報告に集中できる

---

### 3. Test Coverage Analysis ワークフロー

**ファイル**: `.github/workflows/test-coverage-analysis.yml`

**変更内容**:
```yaml
on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - 'frontend/**'
      - 'package*.json'
      - '.github/workflows/test-coverage-analysis.yml'
  pull_request:
    paths:
      - 'backend/**'
      - 'frontend/**'
      - 'package*.json'
      - '.github/workflows/test-coverage-analysis.yml'
```

**トリガー条件**:
- ✅ `backend/` または `frontend/` 実装に変更あり
- ✅ `package.json` に変更あり
- ✅ ワークフロー自体に変更あり

**トリガーされない場合**:
- ❌ ドキュメント・設定ファイルのみ変更
- ❌ `scripts/` のみ変更

**効果**: コードカバレッジ分析は実装変更時だけ実行

---

### 4. Update Quality Dashboard ワークフロー

**ファイル**: `.github/workflows/update-dashboard.yml`

**変更内容**:
```yaml
on:
  workflow_dispatch: {}
  workflow_run:
    workflows: ["Test Matrix"]
    types: [completed]
    conclusions: ["success"]  # ← 追加: 成功時のみ
```

**トリガー条件**:
- ✅ Test Matrix **成功時** のみ実行
- ✅ 手動実行も可能 (`workflow_dispatch`)

**トリガーされない場合**:
- ❌ Test Matrix が **失敗** した場合

**効果**: 失敗したテストでダッシュボード更新を回避（不正な KPI を防止）

---

## 最適化されていないワークフロー（理由付き）

| ワークフロー | 現状 | 理由 |
|---|---|---|
| **AI Review** | PR トリプ時常に実行 | PR を開くたびにレビューが必要 ✅ 適切 |
| **Auto Code Review** | PR トリプ時常に実行 | 自動レビューは常に実行が必要 ✅ 適切 |
| **Auto Merge** | PR マージ時常に実行 | マージ判定は常に実行が必要 ✅ 適切 |
| **Copilot Analyze Trace** | 手動実行 + PR 完了時 | 選択的な詳細分析 ✅ 適切 |
| **Quality Schedule** | スケジュール実行 | 定期的な監視が必要 ✅ 適切 |
| **M2 Issue Intake** | 手動実行 | Issue 作成は手動実行 ✅ 適切 |
| **Spec to Implementation** | 手動実行 | Issue 要件実装は手動実行 ✅ 適切 |

---

## 実装のポイント

### 1. `paths` フィルターの使用

```yaml
on:
  push:
    paths:
      - 'backend/**'        # backend/ 配下の全ファイル
      - 'frontend/**'       # frontend/ 配下の全ファイル
      - 'package*.json'     # package.json, package-lock.json
```

**重要**: `paths` フィルターが指定されているジョブは、全てのパスが一致するまで実行されません。

---

### 2. `conclusions` フィルターの使用

```yaml
on:
  workflow_run:
    workflows: ["Test Matrix"]
    types: [completed]
    conclusions: ["success"]
```

**効果**: 
- `success` → ワークフロー成功時のみトリガー
- `failure` → ワークフロー失敗時のみトリガー（省略可）

---

## 検証方法

### 1. ローカルでの変更検証

```bash
# ワークフローの YAML 構文チェック
npm run lint:workflows
```

### 2. GitHub での動作確認

次の場合のみ Test Matrix が実行されることを確認：
1. ✅ `backend/` 配下のファイルを変更 → Test Matrix 実行
2. ✅ `frontend/` 配下のファイルを変更 → Test Matrix 実行
3. ✅ `package.json` を変更 → Test Matrix 実行
4. ❌ `README.md` だけを変更 → Test Matrix **実行されない**
5. ❌ `.gitignore` だけを変更 → Test Matrix **実行されない**

---

## トラブルシューティング

### Q. パス フィルターを指定しても常に実行される場合

**原因**: `paths` フィルターには制限があります。

**解決策**:
1. ワークフロー YAML の構文が正しいか確認
2. GitHub の UI でワークフロー履歴を確認
3. 必要に応じてワークフロー定義を修正

### Q. Test Matrix は成功しても Quality Report PR が実行されない場合

**原因**: `conclusions: ["success"]` が反映されていない可能性

**確認方法**:
1. Test Matrix の実行結果が `success` になっているか確認
2. Quality Report PR の実行履歴を確認
3. ワークフロー定義を再確認

---

## 今後の最適化案

### Phase 2: さらに細かいパスフィルター

```yaml
# 特定の言語ファイルのみトリガー
on:
  push:
    paths:
      - 'backend/src/**/*.ts'     # TypeScript ファイルのみ
      - 'frontend/src/**/*.tsx'   # React コンポーネントのみ
      - 'scripts/**/*.mjs'        # Node スクリプトのみ
```

### Phase 3: 条件付き実行（マトリックス最適化）

```yaml
# テストタイプごとに実行条件を変更
strategy:
  matrix:
    node-version: [20]
    test-type: [unit, api, e2e, advanced]
    exclude:
      # e2e テストはスケジュール実行のみ
      - test-type: e2e
        event: pull_request
```

---

## コミット履歴

- **652d544**: refactor: Optimize workflow triggers with path filters and success conditions

---

## 参考資料

- [GitHub Actions: トリガーイベント](https://docs.github.com/ja/actions/using-workflows/events-that-trigger-workflows)
- [GitHub Actions: ワークフロー構文 - paths](https://docs.github.com/ja/actions/using-workflows/workflow-syntax-for-github-actions#onpushpaths)
- [GitHub Actions: ワークフロー実行 conclusions](https://docs.github.com/ja/actions/using-workflows/events-that-trigger-workflows#workflow_run)

---

**更新日**: 2026-11-07  
**ステータス**: 実装完了 ✅
