# 🚀 Rollout Checklist: Copilot 自動化の段階的導入

このドキュメントは、**本番環境への Copilot 自動化導入を段階的に行うためのチェックリスト** です。  
各フェーズを完了する前に、すべての項目をチェックしてください。

---

## 📋 Pre-Rollout: 基盤整備（Week 0）

### インフラ・環境構築

- [ ] GitHub リポジトリに Secrets を設定
  - [ ] `COPILOT_SERVICE_URL` - Copilot 呼び出しサービスエンドポイント
  - [ ] `COPILOT_SERVICE_TOKEN` - 認証トークン
  - [ ] `AUTO_MERGE_ENABLED` - `false` で初期化（段階的に有効化）

- [ ] ワークフロー・スクリプトをデプロイ
  - [ ] `.github/workflows/ci-e2e.yml` - E2E 実行・trace 収集
  - [ ] `.github/workflows/copilot-analyze-trace.yml` - trace 解析
  - [ ] `scripts/trace-summary.ts` - trace → JSON 変換
  - [ ] `scripts/pii-filter.ts` - PII 自動除去
  - [ ] `.copilot/skills.json` - Copilot ルール定義

- [ ] テンプレ・ドキュメント配置
  - [ ] `.github/ISSUE_TEMPLATE/acceptance.md`
  - [ ] `tests/specs/acceptance-example.yml`
  - [ ] `.github/PULL_REQUEST_TEMPLATE.md`
  - [ ] `CONTRIBUTING.md`
  - [ ] `.github/auto-merge-policy.md`

- [ ] ディレクトリ構造作成
  - [ ] `tests/specs/` - テスト設計 YAML の保管場所
  - [ ] `.github/audit/` - 監査ログ保管場所
  - [ ] `ops/` - 運用スクリプト・レポート

### チーム・ドキュメント整備

- [ ] チーム全体に説明会実施
  - [ ] 目的：人間 1:Copilot 9 の実現
  - [ ] 分担表：各フェーズで誰が何をするか
  - [ ] 品質ゲート：自動化の限界と人間による確認箇所

- [ ] Documentation 完成
  - [ ] README.md に使用方法を追記
  - [ ] CONTRIBUTING.md にラベル・PR 運用を記述
  - [ ] docs/QA_POLICY.md と整合確認

- [ ] チェック項目合意
  - [ ] Issue 作成時のテンプレ確認
  - [ ] セキュリティ実装チェックリスト確認
  - [ ] リスク分類（low/medium/high）の定義確認

### 環境・ツール検証

- [ ] CI/CD パイプライン動作確認
  ```bash
  npm run lint
  npm run test:unit
  npm run test:e2e
  npm run analyze:trace
  ```

- [ ] PII フィルタ動作確認
  ```bash
  ts-node scripts/pii-filter.ts tests/sample-trace.json
  # 出力: [REDACTED_EMAIL], [REDACTED_IP] など
  ```

- [ ] Trace-summary 生成確認
  ```bash
  ts-node scripts/trace-summary.ts tests/sample-trace.json
  # 出力: trace-summary.json が生成されるか
  ```

- [ ] テストコード自動生成確認
  ```bash
  ts-node scripts/generate-tests-from-spec.ts tests/specs/acceptance-example.yml
  # 出力: UT, E2E, Mock ファイルが生成されるか
  ```

---

## 🎯 Phase 1: 仕様・テスト設計テンプレの運用（Week 1-2）

**ゴール**: Issue 作成 → テスト設計の入力・出力が標準化される

### ステップ実行

- [ ] サンプル Issue を 3 件作成
  - [ ] `tests/specs/example-1.yml` 作成
  - [ ] `tests/specs/example-2.yml` 作成
  - [ ] `tests/specs/example-3.yml` 作成

- [ ] テンプレを使用して Copilot に依頼
  ```
  「この tests/specs/example-1.yml をもとに、
  UT/E2E テストコードを生成してください」
  ```

- [ ] 生成されたコードをレビュー
  - [ ] UT ケースが sufficient か
  - [ ] E2E ステップが realistic か
  - [ ] Mock が外部 API を隔離しているか

### 合格基準

- [ ] Issue テンプレで 3 件の Issue を完成させた
- [ ] テスト設計 YAML が 3 件完成した
- [ ] テストコード自動生成が 3 件成功した
- [ ] 自動生成テストが全て合格した
- [ ] Copilot 提案の採用率 ≥ 70%

**判断**: 全項目チェック → Phase 2 へ進行可能

---

## 🧪 Phase 2: 実装コード自動生成・UT 自動化（Week 3-4）

**ゴール**: テスト設計 → 実装コード生成 → UT 実行まで自動化

### ステップ実行

- [ ] Copilot に実装コード生成を依頼
  ```
  「tests/specs/example-1.yml をもとに、
  backend/src/controllers/foo.ts
  backend/src/services/foo.ts
  を生成してください」
  ```

- [ ] 生成コードをレビュー・補完
  - [ ] セキュリティ実装が正しいか確認
  - [ ] TODO コメント箇所を実装
  - [ ] `npm run lint` でエラーなし

- [ ] UT 実行
  ```bash
  npm run test:unit
  ```

- [ ] カバレッジ確認
  - [ ] 対象モジュール ≥ 90%

- [ ] Draft PR 作成・レビュー
  - [ ] `copilot-generated` ラベル確認
  - [ ] Audit Metadata が挿入されているか
  - [ ] PR 本文に生成ファイル一覧があるか

### 合格基準

- [ ] 実装コード自動生成 3 件成功
- [ ] UT 3 件全て合格（ 100% pass）
- [ ] カバレッジ ≥ 90%
- [ ] SAST（CodeQL）で critical/high なし
- [ ] Draft PR が正しく作成される

**判断**: 全項目チェック → Phase 3 へ進行可能

---

## 🌐 Phase 3: E2E テスト自動化・Trace 解析（Week 5-6）

**ゴール**: E2E 実行 → 失敗自動分析 → 修正提案の自動生成

### ステップ実行

- [ ] E2E テスト実行
  ```bash
  npm run test:e2e
  ```

- [ ] Trace 収集確認
  - [ ] artifact に `traces/` フォルダが生成されているか
  - [ ] trace ファイルサイズが 1MB 以上か（充分なログ）

- [ ] Trace 解析ワークフロー実行
  ```bash
  # .github/workflows/copilot-analyze-trace.yml を手動実行
  ```

- [ ] 生成された trace-summary.json を確認
  - [ ] `failure_category` が正しく分類されているか
  - [ ] `trace_excerpt` が 2000 文字以内か
  - [ ] PII が除去されているか

- [ ] Copilot による修正提案を確認
  - [ ] 診断が 3 文以内か
  - [ ] 提案が 3 候補以上か
  - [ ] 各提案に risk/effort が明記されているか

- [ ] Draft PR 自動作成確認
  - [ ] 修正提案が PR 本文に挿入されているか
  - [ ] Audit Metadata が記録されているか

### 合格基準

- [ ] E2E テスト 3 件以上実行
- [ ] 失敗シナリオ 1 件以上でテスト（意図的に失敗させて確認）
- [ ] Trace 解析の正確性 ≥ 85%（診断が的確か）
- [ ] Draft PR に修正提案が正しく挿入される
- [ ] PII フィルタで個人情報が完全に除去される

**判断**: 全項目チェック → Phase 4 へ進行可能

---

## ✅ Phase 4: 低リスク自動マージの試行（Week 7-8）

**ゴール**: ドキュメント・format 修正を自動マージ（人間不要）

### ステップ実行

- [ ] `AUTO_MERGE_ENABLED` を `true` に設定
  ```bash
  gh secret set AUTO_MERGE_ENABLED --body "true"
  ```

- [ ] 低リスク PR でテスト（3 件）
  - [ ] PR 1: ドキュメント修正 (README.md)
    - [ ] label: `risk-low`
    - [ ] `auto_merge_candidate: true`
    - [ ] 全 CI チェック合格
    - [ ] → 自動マージされるか確認
  
  - [ ] PR 2: 日本語リソース修正 (comments/strings)
    - [ ] 同上

  - [ ] PR 3: Prettier 自動修正 (format)
    - [ ] 同上

- [ ] 監査ログ確認
  ```bash
  cat .github/audit/auto-merge-log.jsonl
  # マージイベントが記録されているか
  ```

- [ ] KPI 集計実行
  ```bash
  GITHUB_TOKEN=xxx node ops/kpi-collector.js
  # ops/kpi-weekly.json を確認
  ```

### 合格基準

- [ ] 低リスク PR 3 件全て自動マージされた
- [ ] 人間によるマージ操作なし
- [ ] 監査ログに全てのマージイベントが記録
- [ ] KPI:
  - [ ] adoption_rate ≥ 80%
  - [ ] auto_merge_success_rate ≥ 95%
  - [ ] human_interventions ≤ 1

**判断**: 全項目チェック → Phase 5 へ進行可能

---

## 📈 Phase 5: 本番運用・KPI 監視（Week 9 以降）

**ゴール**: 継続的な自動化運用・KPI 監視・改善ループの確立

### 週次運用

- [ ] 毎週金曜日 5:00 JST
  ```bash
  GITHUB_TOKEN=xxx node ops/kpi-collector.js
  # ops/kpi-weekly.json が生成される
  ```

- [ ] KPI レビュー（毎週月曜朝）
  - [ ] adoption_rate 確認（目標 80%）
  - [ ] auto_merge_success_rate 確認（目標 95%）
  - [ ] human_interventions 確認（目標 < 1）
  - [ ] security_alerts 確認（目標 0）

- [ ] 問題検知時の対応
  - [ ] adoption_rate < 70% → Copilot skill を調整
  - [ ] auto_merge_success_rate < 85% → auto-merge policy を見直し
  - [ ] human_interventions > 3 → フレーク分析
  - [ ] security_alerts > 0 → 即座に調査・修正

### 月次改善

- [ ] Copilot skill の最適化
  - [ ] 生成テストコードが実装テストを良くカバーしているか
  - [ ] 実装コード生成の精度（セキュリティ実装が正しいか）

- [ ] ポリシー見直し
  - [ ] 自動マージの対象範囲を拡大するか？
  - [ ] リスク分類の定義を変更するか？

- [ ] チーム FBK 実施
  - [ ] 誰が何に時間がかかっているか
  - [ ] 自動化で削減できた作業時間
  - [ ] 人間:Copilot = 1:9 に向けた改善案

### 合格基準（継続運用）

- [ ] KPI 監視が自動化される
- [ ] 問題検知 → 対応が 24 時間以内に完了
- [ ] 採用率が段階的に上がっている（毎月 5% 程度）
- [ ] セキュリティアラートが 0 で維持
- [ ] チーム全体の Copilot 活用が定着

---

## 🚨 Rollback Trigger（自動化を一時停止する条件）

以下いずれかに該当した場合、**即座に Phase を戻す**：

- [ ] 自動マージ失敗率 ≥ 10%
- [ ] セキュリティアラート ≥ 1
- [ ] 本番環境エラー率が 5% 以上増加
- [ ] フレーク率 > 10%
- [ ] 人間介入時間が逆に増加している

**対応**:
1. `AUTO_MERGE_ENABLED` を `false` に設定
2. 原因特定と修正（24 時間以内）
3. チームと共有・承認後、段階的に再開

---

## 📊 KPI ダッシュボード（推奨）

以下のツールでメトリクスを可視化することを推奨：

- **Grafana** - 週次グラフ表示
- **GitHub Project** - Issue・PR 進捗管理
- **Slack 通知** - 毎週月曜朝に KPI を自動投稿

---

## 📞 サポート・相談

- **開発フロー**: @team-lead
- **Copilot 統合**: @devops-team
- **セキュリティ**: @security-team
- **テスト・QA**: @qa-team

---

## ✅ 最終チェックリスト（本番化直前）

- [ ] 全フェーズの合格基準を確認
- [ ] Secrets が正しく設定されているか
- [ ] ワークフロー・スクリプトが正常に動作するか
- [ ] チーム全体が CONTRIBUTING.md を読んで理解しているか
- [ ] 緊急対応フロー（rollback）を確認
- [ ] 管理者が KPI ダッシュボードにアクセスできるか

**全項目チェック** → 🎉 **本番環境での Copilot 自動化の完全導入完了！**

---

**最後に**: 本導入は段階的です。無理に時間短縮しないでください。各フェーズで安定性を十分に確認してから次に進んでください。🙏
