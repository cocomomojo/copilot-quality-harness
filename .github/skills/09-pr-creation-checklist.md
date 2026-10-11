---
name: pr-creation-checklist
description: Defines mandatory quality gates and checklist items for PR creation to prevent common issues (language requirements, AI review response, CI validation)
---

# Skill 09: PR 作成チェックリスト（Quality Gate）

## 概要

PR を作成する際の必須チェック項目を定義します。
これにより「PR説明が日本語でない」「Copilot指摘が残っている」「CI失敗」などの問題を防ぎます。

## Purpose

PR作成時の品質ゲートとして機能し、以下を確保する：
- PR説明が適切な日本語で記載されている
- Copilot AIレビューの HIGH/MEDIUM 指摘が全て対応済み
- CI Status Checks がすべて成功している
- 実装と PR 説明が一貫している

## Trigger

新しい PR を作成するとき、または Draft PR を Ready に変更するとき。

## Required inputs

- PR タイトルと説明案
- 実装ブランチと変更内容
- Copilot AI レビューの指摘（存在する場合）
- CI 実行結果とログ

## Procedure

### Step 1: 言語要件チェック

```
[ ] PR タイトル
  - 日本語で記載（例: "feat: dynamic workflows CI/CD - 統一品質フレームワーク"）
  - または スナップケース英語 (例: "feat: add-dynamic-workflows")
  - 説明的で意図が明確

[ ] PR 説明本文
  - 必ず日本語で記載（例外なし）
  - 以下のセクションを含む：
    - 概要: 何をなぜ変更したのか
    - 変更内容: 具体的な修正項目
    - 主な特徴: 実装の特徴やメリット
    - 既存との互換性: 既存ワークフロー/機能への影響
    - 検証方法: テスト実施内容
```

### Step 2: Copilot AI レビュー対応

```
[ ] Copilot が PR にレビューコメントを投稿したか確認
  
[ ] 重大度別対応（必須）
  - HIGH 重大度指摘
    → 全て対応必須（修正 or 代替案・理由を明記）
    → PR コメントで対応状況を返信
  
  - MEDIUM 重大度指摘
    → 対応推奨（応答必須）
    → PR コメントで対応状況を返信
  
  - LOW 重大度指摘
    → 参考情報（対応は任意）
    → 必要に応じてコメント返信

[ ] 修正後のコミット
  - 指摘対応を新しいコミットで実装
  - コミットメッセージに対応指摘番号を記載
  - PR 説明に「Copilot 指摘対応: X件完了」と記載
```

### Step 3: CI Status Checks 確認

```
[ ] すべての Status Checks が成功している
  - AI Review: pass または neutral
  - Quality checks: success
  - Test results: all passed
  - Build: success

[ ] CI ログを確認
  - エラーログがないか
  - 警告が許容範囲か
  - 失敗原因が明確な場合は対応
```

### Step 4: 実装と説明の一貫性

```
[ ] 変更ファイルと PR 説明が一致しているか
  - PR で「削除」と記載したファイルが実際に削除されているか
  - PR で「追加」と記載した機能が実装されているか
  - 影響範囲が正確に説明されているか

[ ] コミットメッセージ
  - 各コミットが何を実装したのか明確か
  - PR 本文とコミットメッセージが矛盾していないか

[ ] 削除対象ファイル（該当する場合）
  - PR 説明で削除理由が明記されているか
  - 代替案が説明されているか
```

### Step 5: マージ前の最終確認

```
[ ] PR 説明の読みやすさ
  - 日本語が正確か（てにをは、句読点）
  - 見出しや表が見やすく構成されているか
  - 不要な「Running...」プレースホルダーが残っていないか

[ ] Copilot 指摘への返信
  - すべての指摘に対応状況を返信したか
  - 対応が不可能な場合は理由を明記したか

[ ] PR コメントの整理
  - TODO/FIXME コメントが残っていないか
  - 古い会話スレッドがあれば解決済みか確認

[ ] 関連 Issue との紐付け
  - Issue #XX を解決する旨が記載されているか
  - Issue との対応が正確か
```

## Output contract

- PR が作成され、タイトルと説明が上記要件を満たしている
- Copilot AI レビューの HIGH/MEDIUM 指摘が全て対応済み、または対応不可の理由が明記されている
- CI Status Checks がすべて成功している
- PR 説明に以下が含まれている：
  - schemaVersion: 1.0 (or latest)
  - 実装概要と変更内容
  - 既存との互換性について
  - テスト実施内容
  - Copilot 指摘対応状況

## Stop conditions

以下の場合は PR をマージしてはいけません：

1. **言語要件不足**
   - PR 説明が日本語以外
   - PR タイトルが説明的でない

2. **AI レビュー未対応**
   - Copilot の HIGH/MEDIUM 指摘が未対応
   - 対応理由が記載されていない

3. **CI 失敗**
   - Status Checks が failed
   - テスト結果が failed
   - Build エラーがある

4. **内容不一致**
   - PR 説明と実装が矛盾している
   - 削除ファイルの理由が記載されていない

5. **コメント未解決**
   - PR コメント内に TODO/FIXME が残っている
   - Copilot の質問に返信していない

## Do not

- PR 説明を日本語以外で作成しない
- Copilot の HIGH/MEDIUM 指摘を無視してマージしない
- CI 失敗を無視してマージしない
- プレースホルダー（「Running...」など）を残したまま公開しない
- 修正内容を隠したり不正確に説明しない

## Verification

PR 作成時に以下を検証する：

```bash
# PR 説明が日本語か
grep -i "running\|TODO\|FIXME" <PR説明>  # 0件であることを確認

# Copilot コメントを確認
gh pr view <PR番号> --json reviews

# CI Status を確認
gh pr view <PR番号> --json statusCheckRollup

# コミットメッセージ確認
git log --oneline origin/main..<ブランチ>
```

## Relationship to other skills

- **Skill 06 (PR Report and AI Review)**: PR作成直後の AI レビュー
- **Skill 07 (Merge Decision)**: マージ判定前にこのチェックリストを実行
- **Common Contract**: 言語要件と安全境界を共有

## Practical example

### ✅ 良い PR

```
Title: feat: dynamic workflows CI/CD - 統一品質フレームワーク

Description:
## 概要
GitHub Actions Dynamic Workflows を実装し、品質パイプラインを統一しました。

## 変更内容
- test-coverage-analysis.yml: テストカバレッジ分析
- auto-code-review.yml: 自動コードレビュー
- test-matrix.yml: 並列テスト実行
- quality-report-pr.yml: PR コメント投稿
- quality-schedule.yml: 定期実行
- quality.yml: 削除（test-matrix で置き換え）

## 既存ワークフロー
- ai-review.yml: 継続（AI分析は独立価値）
- m2-issue-intake.yml: 継続（Issue自動化は独立機能）

## Copilot 指摘対応
- HIGH 4件: 全て修正完了
- MEDIUM 2件: 全て修正完了
- LOW 1件: M2 validation 追加で対応

詳細は [こちらのコミット](...)
```

**チェック結果**:
- ✅ PR 説明が日本語
- ✅ Copilot 指摘全て対応
- ✅ CI Status: all passed
- ✅ 実装と説明が一致

### ❌ 悪い PR

```
Title: Add workflows

Description:
This PR adds new CI workflows for testing purposes.

[CI が failed]
[Copilot: HIGH 指摘が 3 件未対応]
```

**問題点**:
- ❌ PR タイトルが説明的でない
- ❌ PR 説明が英語（要件違反）
- ❌ CI が失敗している
- ❌ Copilot 指摘が未対応

## FAQ

**Q: PR 説明は必ず日本語ですか？**
A: はい。このリポジトリは日本語ベースのプロジェクトなため、PR 説明は必ず日本語で記載してください。

**Q: Copilot の LOW 指摘も対応必須ですか？**
A: いいえ。LOW は参考情報です。HIGH/MEDIUM は必須です。

**Q: CI が失敗している場合、どうしますか？**
A: 修正してから PR を作成してください。CI 失敗は stop condition です。

**Q: プレースホルダー（「Running...」など）が残った場合？**
A: PR を修正して削除してください。本番環境に不適切です。
