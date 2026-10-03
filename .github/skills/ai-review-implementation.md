# AI Review Skill

## Purpose
AI レビューを PR に対する補助的な品質ゲートとして実装する。最終判断は人間が行い、AI レビューはあくまで補助（差分漏れやテスト不足、秘密情報の検出など）に限定する。

## Trigger
pull_request が作成・更新・Ready for review になったとき。

## Required inputs
- PR 番号
- PR の差分（ファイル一覧・patch）
- PR 本文
- (任意) CI / coverage の結果へのリンク

## Procedure
1. PR metadata を GitHub API から取得する。
2. 変更ファイルを一覧化し、以下をチェックする：
   - Issue との紐付け（PR本文に Issue 番または Issue トークンがあるか）
   - test-design.json のようなテスト設計成果物が含まれているか
   - coverage / e2e 実行結果の明示
   - 差分中に秘密情報・APIキー等が含まれていないか（簡易スキャン）
3. 判定結果（pass/fail/neutral）と stopReasons を生成する。
4. PR にコメントで判定結果と根拠を残す。

## Output contract
- JSON（{result: "pass" | "fail" | "neutral", stopReasons: string[], evidence: {...} }）
- PR コメント（人間が理解しやすい日本語要約）

## Stop conditions
- テスト設計が欠落している
- secret の流出疑いがある
- high/critical なリスクが検出された
- fork PR で secrets を使った判定が必要な場合（安全上の理由で neutral を返す）

## Do not
- 人間レビューの代替としないこと（コメントに明記する）
- PR 内のコードを実行しないこと

## Verification
- スクリプトは GitHub API を使い、PR ファイルの patch を走査して上記チェックを機械的に行う。
- PR コメントと JSON 出力が一致することを確認する。