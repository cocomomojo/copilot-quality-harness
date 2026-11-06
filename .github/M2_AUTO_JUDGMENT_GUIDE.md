# M2 Auto-Judgment Integration Guide

## 概要

M2 ワークフロー後に、自動実装の可否をAIで自動判定し、安全な場合のみ実装を自動進行させます。

## 判定フロー

```
M2 ワークフロー
  ├─ m2-validation.mjs → JSON レポート生成
  ├─ format-m2-report.mjs → Markdown 変換
  └─ m2-auto-judgment.mjs → 実装可否を自動判定
       ├─ ✅ safe-proceed (自動実装可能)
       │    └─ spec-to-implementation.yml をトリガー
       ├─ ⚠️ needs-approval (条件付き/要確認)
       │    └─ Issue コメント + 手動オプション提示
       └─ ❌ manual-only (手動判断必須)
            └─ 理由を明示
```

## 判定基準

### ✅ 自動実装可能 (safe-proceed)
- **条件**:
  - ✓ Frontend スコープのみ
  - ✓ 重大度が low または medium
  - ✓ セキュリティ/個人情報/決済 関連なし
  - ✓ 情報が完全（受入条件、テスト要求が明確）
  - ✓ 複雑度が中程度以下
  
- **アクション**: `spec-to-implementation.yml` ワークフロー自動トリガー

### ⚠️ 条件付き実装 (needs-approval)
- **判定対象**:
  - 重大度 high だが Frontend のみ
  - 複雑度が中程度

- **アクション**: Issue コメント + 手動オプション提示
  ```
  【自動実装判定】条件付き実装可能
  重大度が高いため、以下をご確認ください：
  
  [ ] テスト計画を確認
  [ ] 影響範囲を確認
  
  実装を進める場合: /auto-implement
  手動実装を選択: 何もしない
  ```

### ❌ 手動判断必須 (manual-only)
- **判定対象**:
  - セキュリティ/個人情報/決済 関連
  - Backend/Database スコープ
  - 情報不足
  - 高い複雑度

- **アクション**: 理由を明示して手動判断を促す

## ワークフロー統合例

### m2-issue-intake.yml に追加するステップ

```yaml
- name: Run auto-judgment on M2 report
  if: always() && steps.analyze.outcome != 'skipped'
  id: judgment
  env:
    REPORT_FILE: ${{ runner.temp }}/m2-report.json
    THRESHOLD: moderate
  run: |
    node scripts/m2-auto-judgment.mjs \
      --report "$REPORT_FILE" \
      --threshold "$THRESHOLD" \
      --format env >> "$GITHUB_OUTPUT"
    exit 0  # 失敗してもワークフローは続行

- name: Trigger spec-to-implementation if safe-proceed
  if: steps.judgment.outputs.AUTO_JUDGMENT_LEVEL == 'safe-proceed'
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    ISSUE_NUMBER: ${{ steps.input.outputs.issue_number }}
  run: |
    gh workflow run spec-to-implementation.yml \
      -f issue_number="$ISSUE_NUMBER" \
      -f auto_judgment="true"
```

## 使用方法

### コマンドライン実行

```bash
# JSON 形式で出力
node scripts/m2-auto-judgment.mjs \
  --report m2-report.json \
  --threshold moderate

# GitHub Actions 環境変数形式で出力
node scripts/m2-auto-judgment.mjs \
  --report m2-report.json \
  --threshold moderate \
  --format env
```

### しきい値オプション

- `strict`: 非常に厳格（実装可能判定が少ない）
- `moderate`: バランス型（推奨）
- `loose`: 緩い（Backend含む場合も実装可能）

## 判定ロジック詳細

### 優先度順の検査

1. **リスク要因チェック**（最優先）
   - セキュリティ、個人情報、決済キーワード検出
   - → 検出時は即座に `manual-only`

2. **情報完全性チェック**
   - 受入条件、テスト要求、重大度、スコープが存在
   - → 不足時は `manual-only`

3. **スコープチェック**
   - Backend/Database は制限（strict/moderate モード）
   - → Backend 検出時は `manual-only`

4. **重大度チェック**
   - 高/クリティカルは条件付き (moderate/loose) または制限 (strict)

5. **複雑度チェック**
   - 受入条件数、テスト要求数、説明文長さから算出
   - → 複雑度が高い場合は `needs-approval`

6. **全クリア**
   - → `safe-proceed`

## 例: Issue #56 の判定

```json
{
  "level": "safe-proceed",
  "reason": "自動実装の条件を満たしています: 【機能要望】検証用Webアプリのヘッダーナビゲーション...",
  "factors": [],
  "recommendation": "Frontend 限定の low 重大度実装です。自動実装をトリガーし、テスト実行後に PR を作成します。",
  "metadata": {
    "complexity": 0,
    "severity": "low",
    "scope": ["Frontend"],
    "completeness": []
  }
}
```

→ **結果**: spec-to-implementation.yml が自動トリガー

## 関連スクリプト

- `scripts/m2-auto-judgment.mjs` - 判定エンジン
- `scripts/m2-auto-judgment.test.mjs` - テストスイート
- `scripts/m2-validation.mjs` - M2 分析（前段階）
- `scripts/format-m2-report.mjs` - JSON → Markdown 変換

## テスト実行

```bash
node --test scripts/m2-auto-judgment.test.mjs
```

出力例:
```
# tests 8
# suites 2
# pass 8
# fail 0
```
