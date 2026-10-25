---
name: test-execution-and-evidence
description: Executes tests and collects evidence of quality compliance
---

# Test Execution and Evidence

## Purpose
AIの自己申告ではなくCI実測値で結果を確定する。

## Canonical source（真実源）
- `test-matrix.yml` artifacts を唯一の真実源とする。
- `update-dashboard.yml` では KPI 収集と E2E レポート生成で **同一 run_id** を使用する。

## Required evidence set
- `test-matrix-summary.json`（件数・合否）
- `coverage-report-node-*/coverage-summary.json` または `coverage-final.json`
- `e2e-test-results-node-*`（Playwright JSON）
- `playwright-report-node-*`
- `e2e-videos-node-*`（全テスト動画）
- 失敗時: screenshot / trace.zip / job log URL
## Trigger
実装とテストが揃ったとき。
## Required inputs
変更ブランチ、`test-design.json`、実行環境。
## Procedure
Unit、API、build、必要なE2Eを実行し、同一runIdの結果JSONと失敗証跡を保存する。

### 必須手順（run_id 整合）
1. Test Matrix run_id を確定する（workflow_run起点なら event.run_id を優先）
2. その run_id の artifacts だけをダウンロードする
3. KPI と E2E 集計の両方に同じ run_id を埋め込む
4. E2E 詳細ページに Run URL / JSON / Workflow URL を表示する
## Output contract
`qa/test-management/reports/test-result.json`、ログ、coverage、trace/screenshot（失敗時）。

### update-dashboard 系出力（追加）
- `docs/dashboard/data/latest-kpi.json`
	- `details.github_run_id`
	- `details.coverage_source`
- `docs/reports/data/test-cases.json`
	- `metadata.test_run_id`
- `docs/reports/e2e-latest.html`
	- 実行エビデンス導線（Run URL / JSON / Workflow）
## Stop conditions
テスト失敗、判定不能、未実施の隠蔽、health check失敗、coverage測定不能。
## Do not
失敗を成功に変換しない。
## Verification
コマンド、環境、件数、開始終了、再実行、失敗理由、Workflow URLを確認する。

### 整合チェック項目
- `latest-kpi.json.details.github_run_id === test-cases.json.metadata.test_run_id`
- `failed` 件数が `test-matrix-summary.json.total_failed` と一致
- `coverage_source` が 0% フォールバック理由を説明できる
- 動画リンクが実在ファイル（同名上書きなし）
