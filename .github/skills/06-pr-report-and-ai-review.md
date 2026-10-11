---
name: pr-report-and-ai-review
description: Creates PR with quality evidence and performs AI review evaluation
---

# PR Report and AI Review

## Purpose
PRに設計意図、結果、残存リスクを提示し、AIレビューを補助ゲートにする。
## Trigger
テスト結果が確定しDraft PRを作成するとき。
## Required inputs
Issue、差分、テスト設計、テスト結果、未実施項目。
## Procedure
PR本文とSummaryを生成し、差分・受入条件・観点漏れを確認する。
## Output contract
PR本文、レビュー結果、Summary、Artifact、Issueコメント。同一runIdを使用する。
## Stop conditions
結果と本文の不一致、判定不能、残存リスク未記載。
## Do not
AIレビューを人間承認として扱わない。
## Verification
Issue/PR紐付け、差分とテスト対象、重複コメント更新を確認する。

## Copilot AI Review Response Process（Copilot レビュー対応プロセス）

PR が作成されると、Copilot AI Review が自動的に指摘を投稿します。以下が対応フローです。

### ステップ 1: Copilot レビューコメントを確認

PR 作成直後、Copilot が以下の形式でレビューコメントを投稿：

```
### 🟡 Changes recommended

Multiple findings:
- 🔴 [HIGH] Issue title
- 🟠 [MEDIUM] Issue title  
- 🟡 [LOW] Issue title
```

### ステップ 2: 重大度別対応（必須）

#### HIGH 重大度
- **対応**: 必ず対応（修正 or 代替案・理由を明記）
- **期限**: PR マージ前に完了必須
- **返信**: PR コメントで対応状況を返信
- **例**: 「このコミットで修正しました: abc1234」

#### MEDIUM 重大度
- **対応**: 対応推奨（応答は必須）
- **期限**: PR マージ前に方針を決定
- **返信**: 対応 or 対応不可理由を記載
- **例**: 「この指摘は仕様上対応不可です。理由: ...」

#### LOW 重大度
- **対応**: 参考情報（対応は任意）
- **返信**: 不要（必要に応じて返信可）

### ステップ 3: 修正実装

Copilot の指摘に対応する場合：

```
1. 指摘内容を分析
2. コードを修正
3. テストで検証
4. コミットメッセージに指摘番号を記載
   例: "fix: resolve copilot review - fix test output parsing"
5. git push で PR に追加コミット
```

### ステップ 4: PR コメントで返信

Copilot の各指摘に対して返信コメントを投稿：

```
【修正完了の場合】
"この指摘は [このコミット](link) で対応しました。
修正内容: Vitest と Mocha 両フォーマットに対応"

【対応不可の場合】
"この指摘は対応不可です。理由: 仕様上の制約のため
代替案: 代わりに ... を実装しました"

【参考として対応する場合】
"ご指摘ありがとうございます。今後の改善の参考にします"
```

### ステップ 5: 修正後の再検証

修正コミット後：

1. CI Status Checks がすべて成功しているか確認
2. Copilot が新しい指摘を投稿するか確認
3. 前の指摘が解決したか確認

### ステップ 6: マージ前チェック

PR マージ前に確認：

```
[ ] HIGH 重大度指摘: 全て「対応済み」または「対応不可理由明記」
[ ] MEDIUM 重大度指摘: 対応状況が明確
[ ] CI Status: すべて success
[ ] PR 説明: 修正内容が記載されているか
```

### 実装例

#### ✅ 良い Copilot 対応

```
Copilot 指摘:
- 🔴 [HIGH] Vitest output mismatch breaks coverage analysis
- 🟠 [MEDIUM] PR comment never includes the computed quality table

対応方法:
1. abc1234 コミット: Vitest/Mocha 両フォーマット対応
2. def5678 コミット: 実際の品質テーブルを投稿するよう修正
3. PR コメント: 
   "HIGH 指摘 1 件: Vitest/Mocha両対応で解決 (#abc1234)
   MEDIUM 指摘 1 件: テーブル投稿機能を実装 (#def5678)"

CI Status: ✅ All passed
```

#### ❌ 悪い Copilot 対応

```
Copilot 指摘:
- 🔴 [HIGH] Test output parsing issue

対応なし → PR をマージ申請

→ 結果: マージ不可（stop condition）
```

### FAQ

**Q: Copilot の指摘にはいつ返信しますか？**
A: 修正完了後、または対応不可と判断したら直ちに返信してください。

**Q: 複数の HIGH 指摘がある場合？**
A: すべて対応必須です。1 つでも未対応だと PR はマージできません。

**Q: Copilot の指摘が正確でない場合？**
A: PR コメントで理由を説明し、対応が不要である旨を記載してください。

**Q: 修正後に新しい Copilot 指摘が出た場合？**
A: 新しい指摘に対して同じプロセスで対応してください。
