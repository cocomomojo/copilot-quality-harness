# Skill 01: Copilot レビュー指摘への標準対応フロー

## 概要

GitHub Copilot が PR に残した review findings（HIGH/MEDIUM/LOW 重大度）に対して、体系的・迅速に対応するプロセス。

**目的**: レビュー指摘の見落とし防止、対応の統一化、ドキュメント化

**実行者**: 開発者（+CI/CD 自動化）

---

## レビュー指摘の重大度分類

| 重大度 | 対応期限 | 対応方針 | 例 |
|--------|---------|---------|-----|
| 🔴 **CRITICAL** | 即座 | マージ前に必ず修正 | セキュリティ脆弱性、デッドロック |
| 🟠 **HIGH** | 24 時間以内 | 修正必須、修正方法が明確 | ロジックエラー、型安全性 |
| 🟡 **MEDIUM** | 48 時間以内 | 修正推奨、対応コメント必須 | パフォーマンス、コード品質 |
| ⚪ **LOW** | 1 週間以内 | 後続 PR で対応可（コメント記録） | スタイル、ドキュメント |

---

## 標準対応フロー

### Phase 1: レビュー指摘の収集・分類

**入力**: GitHub PR の Copilot review comments

**処理**:
```bash
gh pr view <pr-number> --json comments | \
  jq '.comments[] | select(.author.login == "Copilot")' \
  > review-findings.json
```

**出力**: review-findings.json
```json
[
  {
    "id": "review_comment_id",
    "body": "指摘内容",
    "severity": "HIGH|MEDIUM|LOW",
    "category": "security|logic|type|performance|style|docs",
    "file": "filename",
    "line": 42,
    "suggestion": "修正案（あれば）",
    "status": "pending|fixed|deferred|acknowledged"
  }
]
```

### Phase 2: 対応方法の決定

**チェックリスト**:
```
[ ] HIGH/CRITICAL は修正必須か？
    - Yes → Phase 3 へ（修正実施）
    - No → Phase 4 へ（対応コメント作成）

[ ] MEDIUM は修正すべきか？
    - Yes → Phase 3 へ（修正実施）
    - No → Phase 4 へ（根拠コメント作成）

[ ] LOW はこのプリで対応か、後続 PR か？
    - 今回 → Phase 3 へ
    - 後続 → Phase 4 へ（追跡タスク作成）
```

### Phase 3: コード修正

**手順**:
```bash
1. 新しいコミットを作成
   git checkout -b fix/review-findings-<pr-number>

2. ファイルを編集
   - Copilot の suggestion に従う（ある場合）
   - または独自の修正方法を採用

3. テストを実行
   npm run lint
   npm run type-check
   npm test

4. 修正内容をコミット
   git commit -m "fix: address Copilot review findings (#<pr-number>)
   
   - [HIGH] <指摘1>: <修正内容>
   - [MEDIUM] <指摘2>: <修正内容>"

5. push して PR に反映
   git push origin fix/review-findings-<pr-number>
```

### Phase 4: 対応コメント作成・投稿

**対応コメント テンプレート**:

```markdown
## ✅ Copilot レビュー指摘への対応

### [HIGH] <指摘タイトル>
**状態**: 固定済み ✅

**修正内容**:
- ファイル: `filename`
- 変更: [変更説明]
- コミット: [commit hash]

**理由**: [修正の根拠]

**確認**: [テスト/検証内容]

---

### [MEDIUM] <指摘タイトル>
**状態**: 後続 PR で対応予定

**理由**: [対応を延期する根拠]

**追跡**: Issue #XXX を作成済み

---

### [LOW] <指摘タイトル>
**状態**: コード品質上は可（低優先度）

**判定根拠**: [なぜ対応不要か、または後回しか]
```

**投稿方法**:
```bash
# PR のトップコメントとして投稿
gh pr comment <pr-number> --body "$(cat response-comment.md)"

# または inline reply として投稿
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments/{comment_id}/replies \
  -f body="$(cat inline-reply.md)"
```

---

## 実装パターン

### パターン 1: 自動修正 + コメント投稿

```yaml
name: Auto-Fix Copilot Review Findings
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  fix-findings:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Fetch Copilot review comments
        id: get-comments
        run: |
          gh pr view ${{ github.event.pull_request.number }} --json comments \
            | jq '.comments[] | select(.author.login == "Copilot")' \
            > review-findings.json
            
      - name: Auto-fix HIGH severity issues
        run: |
          npm run lint --fix
          npm run type-check
          
      - name: Commit auto-fixes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "actions@github.com"
          git add -A
          git commit -m "fix: address Copilot HIGH review findings" || true
          git push
          
      - name: Post response comment
        run: |
          gh pr comment ${{ github.event.pull_request.number }} \
            --body-file .github/templates/copilot-response.md
```

### パターン 2: 手動対応 + チェックリスト

```yaml
name: Copilot Review Checklist
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  create-checklist:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Generate checklist
        run: |
          cat > checklist.md << 'EOF'
          ## Copilot Review Findings チェックリスト
          
          対応が必要な指摘:
          - [ ] HIGH: <指摘1>
          - [ ] MEDIUM: <指摘2>
          - [ ] LOW: <指摘3>
          
          対応完了後、このコメントを編集してチェックボックスを埋めてください。
          EOF
          
      - name: Post checklist
        run: |
          gh pr comment ${{ github.event.pull_request.number }} \
            --body-file checklist.md
```

---

## 対応コメントのベストプラクティス

### ✅ 良い対応コメント

```markdown
## ✅ Copilot レビュー指摘への対応完了

### [HIGH] Unsafe JSON interpolation
**状態**: 修正済み ✅

**修正内容**:
- ファイル: `.github/workflows/auto-code-review.yml` (line 58-62)
- 変更: `echo $JSON_OUTPUT` → heredoc 構文に変更
  ```diff
  - echo $JSON_OUTPUT >> $GITHUB_OUTPUT
  + cat <<'EOF' >> $GITHUB_OUTPUT
  + $JSON_OUTPUT
  + EOF
  ```
- コミット: a588a18

**理由**: JSON エスケープの安全性確保

**確認**: ワークフロー実行時に正常に JSON が出力されることを確認済み

---

### [MEDIUM] Mocha output parsing
**状態**: 対応完了 ✅

**修正内容**:
- 正規表現を Vitest フォーマットにも対応
- ファイル: `scripts/parse-test-output.ts`
- テスト実行: `npm test -- --reporter=json`

---

### [LOW] Comment formatting
**状態**: 後続 PR で対応予定

**理由**: デザイン面での改善であり、機能には影響なし
**追跡**: Issue #42 を作成済み
```

### ❌ 悪い対応コメント

```markdown
// ❌ 指摘を無視
"対応不要です"

// ❌ 不十分
"固定しました"

// ❌ 詳細不足
"了解しました。修正します。"
```

---

## チェックリスト: PR マージ前の確認

```bash
# 1. すべての HIGH/CRITICAL 指摘が対応済みか？
gh pr view <pr-number> --json comments | jq '.comments[] | select(.severity == "HIGH")'

# 2. 対応コメントが投稿されているか？
gh pr view <pr-number> --json comments | grep "対応完了"

# 3. テストが全て passed？
gh pr view <pr-number> --json statusCheckRollup | jq '.statusCheckRollup[] | select(.conclusion != "SUCCESS")'

# 4. コミット履歴が明確か？
git log --oneline <base-branch>..<head-branch>
```

---

## 追跡・管理

### Issue 作成（後続対応分）

```bash
gh issue create \
  --title "Follow-up: Copilot review findings from PR #<pr-number>" \
  --body "
## 概要
PR #<pr-number> の Copilot レビューで指摘された以下の点を後続 PR で対応:

- [ ] [MEDIUM] <指摘>
- [ ] [LOW] <指摘>

## 参考
- PR: #<pr-number>
- コメント: [link]
" \
  --label "follow-up,technical-debt"
```

### プロジェクトボード登録

```bash
# Copilot レビュー対応を project に追加
gh project item-add <project-id> \
  --id <issue-id> \
  --field-values priority=high
```

---

## 自動化・CI 連携

### GitHub Actions での自動コメント投稿

```yaml
- name: Post Copilot Response Comment
  if: github.event.pull_request.draft == false
  run: |
    cat > response.md << 'EOF'
    # Copilot Review Response Template
    
    ## Status: Pending Review
    
    Below are responses to Copilot's findings:
    
    - [x] HIGH: Fixed
    - [ ] MEDIUM: Under investigation
    - [ ] LOW: Deferred to next PR
    
    Details: [Link to commits]
    EOF
    
    gh pr comment ${{ github.event.pull_request.number }} --body-file response.md
```

### Slack 連携（オプション）

```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "❌ Copilot HIGH review findings detected in PR #${{ github.event.pull_request.number }}"
      }
```

---

## よくある質問

**Q: HIGH 指摘に同意できない場合は？**  
A: 対応コメントで「理由」セクションに判断根拠を明記し、チームレビューで確認。

**Q: 修正に時間がかかる場合は？**  
A: 対応コメントで進捗を報告し、タイムラインを示す。

**Q: 自動修正ツールで対応できない場合は？**  
A: 手動修正とし、修正内容をコミットメッセージに明記。

**Q: 複数人で対応する場合は？**  
A: Issue/Project で担当を分け、それぞれのコメントを投稿。

---

## 関連スキル

- [Skill 00: AI-Powered Automated Failure Analysis](./00-ai-failure-analysis-template.md)
- [Skill 10: Playwright トレース解析](./10-playwright-trace-analysis.md)
- [Dynamic Workflows CI/CD](../WORKFLOWS_GUIDE.md)

---

## 参考例

### 実例 1: PR #6 Dynamic Workflows
- 指摘: 7 件（HIGH 4, MEDIUM 2, LOW 1）
- 対応: コミット a588a18 にまとめて修正
- コメント: [リンク](https://github.com/cocomomojo/copilot-quality-harness/pull/6)

### 実例 2: PR #7 Playwright PoC
- 指摘: 6 件（HIGH 1, MEDIUM 3, LOW 2）
- 対応: コミット 9a59afe で修正
- コメント: 包括的な対応コメントを投稿

---

## 実装リソース

- `.github/templates/copilot-response.md` – 対応コメントテンプレート
- `scripts/fetch-copilot-comments.ts` – Copilot コメント取得スクリプト
- `.github/workflows/handle-copilot-review.yml` – 自動処理ワークフロー

---

## まとめ

**このスキルのポイント**:
1. 重大度に応じた対応期限を設定
2. 対応内容を詳細に記録（ドキュメント化）
3. 後続対応は Issue で追跡
4. 自動化可能な部分は CI で実装

**目標**: Copilot レビュー指摘の見落としゼロ、対応の透明性確保
