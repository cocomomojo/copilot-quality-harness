# M2 自動実装判定: Copilot Skill 版

## 概要

**ルールベース判定** から **AI エージェント判定** へのアップグレードです。

Copilot AI（Claude Sonnet 4）が、GitHub Issue の M2 分析レポートを入力として、
自動実装の可否を**文脈的に判定**します。

---

## 判定ロジック（AI が考慮する観点）

### 🧠 従来の方式（m2-auto-judgment.mjs）

```javascript
// テキストマッチング → 判定
if (text.includes('セキュリティ')) {
  return 'manual-only';  // キーワード検出 → 即座に判定
}
```

**課題**:
- 文脈を理解しない
- 誤検出が多い
- ルール追加が大変

### ✨ 新しい方式（Skill マニフェスト + Copilot AI）

```yaml
# .copilot/m2-auto-judgment-skill.md

Copilot AI が以下を総合判定：
1. 受入条件、テスト要求から複雑度を推定
2. Issue 全体の文脈でセキュリティリスクを判定
3. スコープと重大度を組み合わせた評価
4. 実装に必要な情報が十分か判断
5. 本番環境への影響を予測
```

**メリット**:
- 文脈を理解した判定
- 誤検出が少ない
- 推奨アクションが具体的
- Skill を編集するだけでカスタマイズ可能

---

## 判定の具体例

### ケース 1: 【セキュリティ】パスワード暗号化（Backend）

**ルールベース版**:
```javascript
// keyword 'セキュリティ' + 'Backend' 検出
→ manual-only
```
**判定**: 機械的・単純

**AI 版**:
```
Copilot AI の判断:

"パスワード暗号化という題目は確かにセキュリティ関連ですが、
 受入条件を見ると『UI フォームにセキュアな送信フォーム機能を追加』
 という要求のようです。
 
 ただし暗号化ロジックの実装を伴う場合、
 セキュリティレビューが必須のため manual-only。
 
 具体的には以下を確認してください：
 1. 暗号化アルゴリズムの選定（bcrypt、Argon2など）
 2. キー管理方式
 3. セキュリティレビュープロセス"
```
**判定**: 文脈的・具体的・推奨アクション明示

### ケース 2: 【UI リニューアル】決済画面（Frontend）

**ルールベース版**:
```javascript
// keyword '決済' 検出
→ manual-only  // 決済関連は全て制限
```
**判定**: 過剰制限の可能性

**AI 版**:
```
Copilot AI の判断:

"決済画面のUIリニューアルですね。
 
 受入条件から見ると、これはデザイン変更で、
 決済ロジックそのものは変わらないようです。
 
 Frontend のみの変更なので実装可能ですが、
 決済関連のため以下を確認してください：
 
 1. デザイン案のビジネス承認
 2. 決済ロジックに変更がないことの確認
 3. セキュリティチームレビュー
 
 →needs-approval (条件付き実装可能)"
```
**判定**: 柔軟・状況判定・確認ポイント明示

---

## 使用方法

### 1. コマンドラインから直接実行

```bash
# Copilot CLI でスキルを実行
copilot review --skill "m2-auto-judgment" \
  --input m2-report.json \
  --context "このIssueは自動実装可能ですか？"

# JSON 形式で出力
copilot review --skill "m2-auto-judgment" \
  --input m2-report.json \
  --format json \
  --output judgment.json
```

### 2. GitHub Actions ワークフロー内で実行

```yaml
- name: Run M2 auto-judgment with Copilot Skill
  id: judgment
  env:
    REPORT_FILE: ${{ runner.temp }}/m2-report.json
  run: |
    # Skill を実行して結果をファイルに出力
    copilot review --skill "m2-auto-judgment" \
      --input "$REPORT_FILE" \
      --format json \
      --output /tmp/judgment.json
    
    # 結果をパース
    LEVEL=$(jq -r '.level' /tmp/judgment.json)
    REASON=$(jq -r '.reason' /tmp/judgment.json)
    
    echo "JUDGMENT_LEVEL=$LEVEL" >> "$GITHUB_OUTPUT"
    echo "JUDGMENT_REASON=$REASON" >> "$GITHUB_OUTPUT"

- name: Trigger implementation if safe-proceed
  if: steps.judgment.outputs.JUDGMENT_LEVEL == 'safe-proceed'
  run: |
    gh workflow run spec-to-implementation.yml \
      -f issue_number=${{ github.event.issue.number }}

- name: Comment with needs-approval result
  if: steps.judgment.outputs.JUDGMENT_LEVEL == 'needs-approval'
  run: |
    gh issue comment ${{ github.event.issue.number }} \
      --body "⚠️ 条件付き実装可能

${{ steps.judgment.outputs.JUDGMENT_REASON }}

以下を確認後、 \`/auto-implement\` でコメントしてください。"
```

### 3. Issue コメントから実行

ユーザーが Issue でコメント:
```
@copilot-bot auto-judgment

判定を実行してください。
```

Copilot が Skill を実行して結果をコメント。

---

## 実装前後の比較

### Before（ルールベース）

```bash
$ node scripts/m2-auto-judgment.mjs --report m2-report.json

{
  "level": "manual-only",
  "reason": "制限対象: security-related",  ← 理由が単純
  "factors": ["security-related"],
  "recommendation": "セキュリティ、個人情報、決済関連は手動実装が必須です"
}
```

### After（AI 判定）

```bash
$ copilot review --skill "m2-auto-judgment" --input m2-report.json

{
  "level": "needs-approval",
  "reason": "セキュリティとBackendの実装が含まれますが、
             UIフォーム層の実装であれば Frontend 限定で可能です。
             ただし暗号化ロジックのセキュリティレビューが必須です。",
  "factors": ["security-related", "backend-changes", "high-severity"],
  "recommendation": "以下の確認が必須です：
    1. 暗号化アルゴリズムの選定
    2. キー管理方式
    3. セキュリティレビュー
    4. 本番環境への段階的リリース計画
    
    確認後、/auto-implement コメントで実装を進行",
  "confidence": 0.82,  ← AI の確度
  "metadata": {
    "complexity": 5,
    "severity": "high",
    "scope": ["Backend", "Frontend"],
    "notes": "UI層のみの場合は safe-proceed の可能性あり"
  }
}
```

**差異**:
- ✅ 理由が詳細・文脈的
- ✅ 推奨アクションが具体的
- ✅ 確度（confidence）が明示
- ✅ 条件付き判定（needs-approval）が可能
- ✅ メタデータが豊富

---

## Skill のカスタマイズ

### 組織ポリシーに基づく判定ルールを追加

`.copilot/m2-auto-judgment-skill.md` を編集して、
組織特有のルールを追加可能：

```markdown
## 社内ポリシー特例

### PCI-DSS 準拠プロジェクト
- 決済関連は厳格に manual-only
- Backend スコープは always manual-only

### 開発チーム限定プロジェクト
- 複雑度判定を緩い設定
- needs-approval が needs-approval → safe-proceed に

### 新機能リリース
- 最新 3 ヶ月は manual-only
- その後は通常判定に戻す
```

Skill を保存すると、次回の実行から新ルールが反映されます。

---

## トラブルシューティング

### Copilot CLI が見つからない

```bash
# インストール
npm install -g @copilot/cli

# 認証
copilot auth login

# バージョン確認
copilot --version
```

### Skill が見つからないエラー

```bash
# .copilot/skills.json を確認
cat .copilot/skills.json | jq '.skills.m2_auto_judgment'

# Skill を再読み込み
copilot skill reload
```

### 判定結果が空

```bash
# 入力 JSON が正しいか確認
cat m2-report.json | jq .

# Manual で実行してログを見る
copilot review --skill "m2-auto-judgment" \
  --input m2-report.json \
  --debug
```

---

## 従来型との選択

| 方式 | 用途 |
|------|------|
| **ルールベース** (m2-auto-judgment.mjs) | 高速判定、オフライン、シンプルなルール |
| **AI 判定** (Skill + Copilot) | 精密判定、柔軟性、推奨アクション重視 |
| **ハイブリッド** (両方) | フォールバック機構、精度向上 |

---

## 関連ドキュメント

- `.copilot/m2-auto-judgment-skill.md` - Skill 詳細
- `.github/M2_AUTO_JUDGMENT_GUIDE.md` - 旧版ガイド（ルールベース）
- `scripts/m2-auto-judgment.mjs` - ルールベース実装（フォールバック用）

---

## まとめ

**ルールベース** → **AI エージェント判定** へのアップグレードで：

✅ **文脈的な判定** - キーワード単純マッチから AI の理解へ
✅ **推奨アクション** - 具体的な確認ポイントを提示
✅ **カスタマイズ** - Skill を編集するだけで組織ポリシー反映
✅ **透明性** - 判定理由と確度を明示

これにより、M2 ワークフローから実装までの全過程が、より精密で信頼できる AI 判定に基づいて進行します。 🚀
