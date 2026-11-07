# M2 AI 判定ログの確認方法【完全ガイド】

> **質問**：`.copilot/m2-auto-judgment-skill.md` は M2 Issue Intake を手動実行したら自動で動作する？判定結果ログはどこに出力される？

## ✅ 答え

**はい、自動で動作します！** ワークフロー内に AI 判定ステップが統合されました。

判定結果は **3 つの場所** に出力されます：

1. **GitHub Actions ログ** （ステップ実行ログ）
2. **Issue コメント** （AI 判定結果セクション）
3. **Artifacts** （JSON ファイル）

---

## 🎯 M2 Issue Intake ワークフロー構成（更新版）

```
GitHub Actions ワークフロー: m2-issue-intake.yml

1️⃣ Validate dispatch input
   └─ Issue 番号を検証

2️⃣ Fetch trusted same-repository issue
   └─ Issue データを GitHub API から取得

3️⃣ Run read-only triage, repository analysis, and test design
   └─ scripts/m2-validation.mjs 実行
   └─ 出力: m2-report.json（Issue 分析結果）

4️⃣ Run AI judgment with Copilot Skill ✨【新規】
   └─ Copilot Skill で AI 判定実行
   └─ 成功 → judgment.json を生成
   └─ 失敗 → フォールバックへ

5️⃣ Run rule-based judgment as fallback ✨【新規】
   └─ AI 判定失敗時に自動実行
   └─ scripts/m2-auto-judgment.mjs を実行
   └─ 出力: judgment.json（ルールベース判定結果）

6️⃣ Format M2 report as Markdown
   └─ m2-report.json と judgment.json を Markdown に変換
   └─ 出力: m2-report.md（人間が読みやすい形式）

7️⃣ Comment with AI judgment result ✨【更新】
   └─ Issue に自動コメント投稿
   └─ 内容: 分析結果 + AI 判定結果

8️⃣ Upload M2 report and judgment artifacts ✨【更新】
   └─ JSON ファイルを Artifacts に保存
   └─ 保持期間: 14 日
```

---

## 📊 判定結果ログの出力場所

### 1️⃣ GitHub Actions ログ

**URL**: `https://github.com/cocomomojo/copilot-quality-harness/actions/runs/{RUN_ID}`

**ステップ**: "Run AI judgment with Copilot Skill"

**ログ内容**:

```
Run AI judgment with Copilot Skill
  Evaluating: /runner/temp/m2-report.json
  
  ✅ AI judgment completed via Copilot Skill
  
  Judgment Result:
  {
    "level": "safe-proceed",
    "reason": "Frontend 限定の低リスク UI 機能です。...",
    "confidence": 0.95,
    "factors": [],
    "recommendation": "自動実装をトリガーします。"
  }
```

**フォールバック時のログ**:

```
Run AI judgment with Copilot Skill
  ...
  ⚠️ AI judgment failed; will use rule-based fallback
  
Run rule-based judgment as fallback
  ⚠️ Using rule-based fallback judgment...
  ✅ Fallback judgment completed
```

---

### 2️⃣ Issue コメント

**URL**: `https://github.com/cocomomojo/copilot-quality-harness/issues/{ISSUE_NUMBER}`

**コメント内容**:

```markdown
## M2 自動化ワークフロー: ✅ 自動化可能

Issue: #57
ソース: cocomomojo/copilot-quality-harness (検証済み)
AIモデル呼び出し: safe-proceed  ← 【新規】AI 判定結果が表示
ソース書き込み、ブランチ作成、PR作成: なし
レポートアーティファクト: [M2 実行結果](...)

### 🤖 AI 自動判定結果  ← 【新規】セクション

**判定レベル**: `safe-proceed`
**判定理由**: Frontend 限定の低リスク UI 機能です。受入条件も明確でテストプランも完備されています。
**確度**: 95.0%
**検出されたリスク要因**: (なし)
**推奨アクション**: 自動実装をトリガーします。

---

### Issue 要件サマリー

| 項目 | 値 |
|------|-----|
| 重大度 | low |
| 影響範囲 | Frontend |
...
```

---

### 3️⃣ Artifacts（JSON ファイル）

**場所**: GitHub Actions → Run → Artifacts

**ファイル名**: `m2-issue-{ISSUE_NUMBER}-run-{RUN_ID}`

**含まれるファイル**:

```
m2-report.json    ← Issue 分析結果（M2 による）
judgment.json     ← AI 判定結果（Copilot Skill / ルールベース）
```

**ダウンロード・確認方法**:

```bash
# Artifacts をダウンロード
gh run download {RUN_ID} -n m2-issue-{ISSUE_NUMBER}-run-{RUN_ID}

# judgment.json の内容を確認（AI 判定結果）
cat judgment.json | jq

# m2-report.json の内容を確認（Issue 分析結果）
cat m2-report.json | jq

# 判定レベルのみ抽出
cat judgment.json | jq '.level'

# 判定理由のみ抽出
cat judgment.json | jq '.reason'

# 確度のみ抽出
cat judgment.json | jq '.confidence'
```

**judgment.json の構造**:

```json
{
  "level": "safe-proceed|needs-approval|manual-only",
  "reason": "判定理由（詳細な説明）",
  "confidence": 0.95,
  "factors": ["factor1", "factor2", ...],
  "recommendation": "推奨アクション",
  "metadata": {
    "complexity": 2,
    "severity": "low",
    "scope": ["Frontend"]
  }
}
```

---

## 🔍 ログを確認する 3 つの方法

### 方法 1: GitHub Web UI（簡単）

```
1️⃣ GitHub → Actions
2️⃣ ワークフロー実行（黄色または緑色）をクリック
3️⃣ ジョブをクリック
4️⃣ "Run AI judgment with Copilot Skill" ステップをクリック
5️⃣ ログが表示される
```

### 方法 2: GitHub CLI（コマンドライン）

```bash
# ワークフロー実行ログをすべて確認
$ gh run view {RUN_ID} --log | grep -A20 "Run AI judgment"

# 特定の部分のログのみ抽出
$ gh run view {RUN_ID} --log | grep "AI judgment\|rule-based\|confidence"

# 実行状態を確認（詳細）
$ gh run view {RUN_ID}
```

### 方法 3: Artifacts から JSON を直接確認

```bash
# Artifacts をダウンロード
$ gh run download {RUN_ID} -n m2-issue-{ISSUE_NUMBER}-run-{RUN_ID}

# judgment.json の詳細を表示
$ cat judgment.json | jq '.'

# 判定レベルだけを確認
$ cat judgment.json | jq '.level'

# JSON を人間が読みやすい形式で表示
$ cat judgment.json | jq . --tab
```

---

## 📋 実行フロー例（実際のログ）

### ケース 1: AI 判定成功

```
M2 Issue Intake ワークフロー実行
  ↓
【ステップ 4: Run AI judgment with Copilot Skill】
  ✅ Evaluating: /runner/temp/m2-report.json
  ✅ AI judgment completed via Copilot Skill
  ✅ Judgment saved to /runner/temp/judgment.json
  
  Output:
  {
    "level": "safe-proceed",
    "reason": "Frontend 限定の低リスク UI 機能です。...",
    "confidence": 0.95
  }
  
  → ai_judgment_success=true を出力
  ↓
【ステップ 5: Run rule-based judgment as fallback】
  ⏭️ スキップ（AI 判定成功のため）
  ↓
【ステップ 6: Format M2 report as Markdown】
  ✅ m2-report.md を生成
  ✅ AI 判定結果セクションを追加
  ↓
【ステップ 7: Comment with AI judgment result】
  ✅ Issue コメント投稿
  └─ 「AIモデル呼び出し: safe-proceed」
  └─ 「### 🤖 AI 自動判定結果」セクション
  ↓
【ステップ 8: Upload M2 report and judgment artifacts】
  ✅ m2-report.json + judgment.json をアップロード
```

### ケース 2: AI 判定失敗 → 自動フォールバック

```
【ステップ 4: Run AI judgment with Copilot Skill】
  ❌ copilot: command not found
  ⚠️ AI judgment failed; will use rule-based fallback
  
  → ai_judgment_success=false を出力
  ↓
【ステップ 5: Run rule-based judgment as fallback】
  ✅ Running rule-based judgment...
  ✅ Executing: node scripts/m2-auto-judgment.mjs
  
  Output:
  {
    "level": "manual-only",
    "reason": "セキュリティとBackendの実装が含まれます。",
    "factors": ["security-related", "backend-changes"]
  }
  
  ✅ Fallback judgment completed
  ↓
【ステップ 6-8】
  ✅ judgment.json を使用して処理続行
  ✅ Issue コメント投稿（フォールバック判定結果）
  ✅ Artifacts アップロード
```

---

## ⚡ クイック確認コマンド

```bash
# 【最新のワークフロー実行を確認】
$ gh run list --workflow m2-issue-intake.yml --limit 1 --json status,number,headBranch

# 【最新実行のログから AI 判定関連を抽出】
$ RUN_ID=$(gh run list --workflow m2-issue-intake.yml --limit 1 --json number --jq '.[0].number')
$ gh run view $RUN_ID --log | grep -E "AI judgment|rule-based|confidence"

# 【Issue コメントから AI 判定結果を確認】
$ gh issue view 57 | grep -A10 "AI 自動判定結果"

# 【Artifacts から judgment.json をダウンロード】
$ RUN_ID=12345678
$ ISSUE_NUMBER=57
$ gh run download $RUN_ID -n m2-issue-${ISSUE_NUMBER}-run-${RUN_ID}
$ cat judgment.json | jq .

# 【判定レベルのみを表示】
$ cat judgment.json | jq '.level'

# 【確度を表示】
$ cat judgment.json | jq '.confidence * 100 | "\(.)%"'
```

---

## 🎓 ログ確認フロー（推奨手順）

```
1️⃣ M2 Issue Intake を手動実行
   $ gh workflow run m2-issue-intake.yml -f issue_number=57

2️⃣ ワークフロー完了を待つ（1-2分）
   $ gh run watch

3️⃣ GitHub Actions ログを確認
   $ gh run view --log | grep "AI judgment\|rule-based"

4️⃣ Issue コメントを確認
   $ gh issue view 57 --web
   # ブラウザで Issue の「AI 自動判定結果」セクションを確認

5️⃣ 判定結果詳細を確認（必要に応じて）
   $ RUN_ID=$(gh run list --workflow m2-issue-intake.yml --limit 1 --json number --jq '.[0].number')
   $ gh run download $RUN_ID
   $ cat judgment.json | jq .
```

---

## ✨ 改善内容の要約

| 項目 | 前（AI 統合前） | 後（AI 統合後） |
|------|-------------|----------|
| **AI モデル呼び出し** | なし | ✅ Copilot Skill（AI）or ルールベース |
| **GitHub Actions ログ** | M2 分析のみ | ✅ M2 分析 + AI 判定ステップ |
| **Issue コメント** | M2 分析結果のみ | ✅ M2 分析 + AI 判定結果 |
| **Artifacts** | m2-report.json のみ | ✅ m2-report.json + judgment.json |
| **判定結果の詳細度** | 低（ステータスのみ） | ✅ 高（理由、確度、リスク要因など） |
| **フォールバック機構** | なし | ✅ AI 失敗時に自動フォールバック |

---

## 🔗 関連ドキュメント

- [`.github/workflows/m2-issue-intake.yml`](../workflows/m2-issue-intake.yml) - ワークフロー定義
- [`.copilot/m2-auto-judgment-skill.md`](../../.copilot/m2-auto-judgment-skill.md) - AI 判定ロジック
- [`scripts/m2-auto-judgment.mjs`](../../scripts/m2-auto-judgment.mjs) - ルールベース判定
- [`.github/M2_ISSUE_WORKFLOW_GUIDE.md`](./M2_ISSUE_WORKFLOW_GUIDE.md) - Issue 作成～実装フロー

---

**これで、M2 Issue Intake ワークフロー内で AI 判定が自動実行され、結果が 3 つの場所に出力されます。** ✨
