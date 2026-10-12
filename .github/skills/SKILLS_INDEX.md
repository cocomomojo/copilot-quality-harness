# GitHub Skills Index

リポジトリ内で利用可能な Copilot Skills（再利用可能なプロセス・パターン）の中央インデックス。

---

## 📚 スキル一覧

### [00] AI-Powered Automated Failure Analysis (汎用テンプレート)
**目的**: 任意の CI/CD 失敗ログを AI が自動解析し、修正案を生成  
**対象**: テスト失敗、ビルド失敗、デプロイ失敗、E2E テスト失敗など  
**トリガー**: 手動（workflow_dispatch）/ 自動（pull_request, workflow_run）  
**成果物**: failure-summary.json, analysis.json, Draft PR または PR コメント  
**実装状態**: ✅ テンプレート完成、Phase 2 実装予定  

**ファイル**:
- `.github/skills/00-ai-failure-analysis-template.md` – 詳細ガイド
- `.github/templates/draft-pr-body.md` – Draft PR テンプレート

**適用例**: Playwright トレース解析、Jest 失敗、ビルドエラー

---

### [01] Copilot レビュー指摘への標準対応フロー
**目的**: Copilot の PR review findings に体系的・迅速に対応  
**対象**: HIGH/MEDIUM/LOW 重大度の指摘  
**トリガー**: PR が open または synchronize されたとき（手動確認）  
**成果物**: コード修正、対応コメント、Issue（後続対応分）  
**実装状態**: ✅ テンプレート完成、実装例多数

**ファイル**:
- `.github/skills/01-copilot-review-response-template.md` – 詳細ガイド
- `.github/templates/copilot-response.md` – 対応コメントテンプレート

**適用例**: PR #6 Dynamic Workflows、PR #7 Playwright PoC、PR #8 Phase 2

---

### [10] Playwright トレース解析と Copilot 修正案生成
**目的**: Playwright テスト失敗を自動解析し、修正案を Draft PR で提案  
**トリガー**: 手動（workflow_dispatch）→ 将来は PR トリガーへ拡張  
**成果物**: trace-summary.json, analysis.json, Draft PR  
**実装状態**: ✅ Phase 1 完成（PR #7 マージ済み）、Phase 2 進行中（PR #8）

**ファイル**:
- `.github/skills/10-playwright-trace-analysis.md` – 詳細ガイド
- `.github/workflows/copilot-analyze-trace.yml` – ワークフロー定義
- `scripts/trace-summary.ts` – トレース解析スクリプト
- `scripts/copilot-client.ts` – Copilot API クライアント（モック）
- `scripts/create-test-trace.ts` – テスト用 trace.zip 生成
- `qa/TRACE_ANALYSIS_GUIDE.md` – ユーザーガイド
- `qa/draft-pr-body.md` – Draft PR テンプレート

**実行方法**:
```bash
# 手動トリガー
gh workflow run copilot-analyze-trace.yml \
  -f artifact_id=<trace-artifact-id>

# または npm 経由
npm run analyze:trace -- trace-artifacts/trace.zip
```

---

## 🔄 スキル間の関係図

```
┌─────────────────────────────────────────────┐
│  [00] AI-Powered Failure Analysis テンプレート │
│  (汎用: テスト・ビルド・デプロイ失敗)       │
└────────────┬──────────────────────────────┘
             │
             ├─→ [10] Playwright トレース解析 (特化版)
             │     └─→ ワークフロー: copilot-analyze-trace.yml
             │
             └─→ [他の特化版も実装可能]
                 (Jest 失敗解析, ビルド失敗解析など)

┌──────────────────────────────────────────────┐
│  [01] Copilot レビュー指摘への対応フロー     │
│  (全 PR に共通)                              │
└──────────────────────────────────────────────┘
     │
     ├─→ 全ワークフローの Copilot review に適用
     └─→ テンプレート: copilot-response.md
```

---

## ✨ 新しい機能追加時のチェックリスト

ワークフロー・機能を新規実装する際は、以下を確認してください：

**実装時**:
- [ ] 関連する Skill があるか確認（00 / 01 / 10）
- [ ] 適用可能なテンプレートがあるか確認
- [ ] 失敗シナリオを考慮した設計（Skill 00 に基づく）
- [ ] Copilot review への対応方針を事前に決定

**PR 作成時**:
- [ ] PR 説明に関連 Skill へのリンクを記載
- [ ] Copilot review を受け取ったら、Skill 01 に従い対応

**マージ前**:
- [ ] 全 Copilot 指摘が Skill 01 に従い対応済みか確認
- [ ] テスト・検証が完了

---

## 📖 使用例

### シナリオ 1: Playwright テスト失敗の自動解析

```bash
# Step 1: トレース artifact をダウンロード（CI から、または手動）
# Step 2: ワークフロー実行
gh workflow run copilot-analyze-trace.yml -f artifact_id=12345

# Step 3: Draft PR がレビューを待つ
# Step 4: レビュー指摘に対して Skill 01 で対応
```

**関連 Skill**: [10] Playwright トレース解析、[01] レビュー指摘対応

---

### シナリオ 2: Jest テスト失敗の自動解析（将来実装）

```bash
# 参考: Skill 00 をベースに "jest-failure-analysis.yml" を実装
# 実装するときは以下を参考に:
# - failure-summary.json の schema は同じ
# - copilot-client.ts は再利用可
# - テンプレートは共有
```

**関連 Skill**: [00] AI-Powered Failure Analysis

---

### シナリオ 3: PR に Copilot review が付いた場合

```bash
# Step 1: PR を確認
gh pr view <pr-number> --json comments

# Step 2: Skill 01 のテンプレートを確認
cat .github/skills/01-copilot-review-response-template.md

# Step 3: 対応コメントを作成・投稿
gh pr comment <pr-number> --body-file response.md
```

**関連 Skill**: [01] Copilot レビュー指摘への対応フロー

---

## 🛠️ スキルを新規作成する場合

1. `.github/skills/XX-skill-name.md` を作成（XX は通し番号）
2. 以下を含める：
   - 概要（目的、対象）
   - 標準フロー（Phase 1, 2, 3）
   - ワークフロー実装パターン
   - テンプレートファイル参照
   - チェックリスト
   - 関連スキルへのリンク

3. このファイル（SKILLS_INDEX.md）を更新

4. PR で提案し、レビューを受ける

**テンプレート**: `.github/skills/00-ai-failure-analysis-template.md` を参考に

---

## 📋 スキルの段階別実装状態

| スキル | 状態 | 進捗 |
|--------|------|------|
| [00] AI-Powered Failure Analysis | 🟡 計画済み | テンプレート完成、実装待ち |
| [01] Copilot レビュー指摘対応 | ✅ 完成 | 実装例多数、テンプレート完備 |
| [10] Playwright トレース解析 | 🟠 進行中 | Phase 1 完成、Phase 2 実装中 |

---

## 📚 ドキュメント体系

```
.github/
├── skills/                          # スキル定義
│   ├── SKILLS_INDEX.md              # 👈 このファイル
│   ├── 00-ai-failure-analysis-template.md
│   ├── 01-copilot-review-response-template.md
│   └── 10-playwright-trace-analysis.md
├── templates/                       # 再利用可能テンプレート
│   ├── copilot-response.md
│   ├── draft-pr-body.md
│   └── [他のテンプレート]
├── workflows/                       # GitHub Actions ワークフロー
│   ├── copilot-analyze-trace.yml
│   ├── test-matrix.yml
│   └── [他のワークフロー]
└── WORKFLOWS_GUIDE.md               # ワークフロー完全ガイド

qa/                                 # テストケース・ガイド
├── TRACE_ANALYSIS_GUIDE.md
├── PHASE2_PROGRESS.md
└── [サンプルファイル]

scripts/                            # 実行スクリプト
├── trace-summary.ts
├── copilot-client.ts
└── create-test-trace.ts
```

---

## 🎯 今後の拡張予定

**Phase 2B（2-4週間）**:
- [00] の実装例を追加（Jest, ビルド, デプロイ）
- [10] の Phase 2B を実装（実 Copilot API 統合）

**Phase 3（1ヶ月）**:
- [11] E2E テスト失敗解析スキル
- [12] パフォーマンス回帰分析スキル
- [20] セキュリティ脆弱性解析スキル

---

## ✅ クイックスタート

### 既存 Skill の使用

1. 対応するスキルファイルを読む
2. テンプレートファイルをコピー
3. 情報を記入して実行

### 新規 Skill の実装

1. このインデックスを確認（類似の Skill がないか）
2. `.github/skills/` に新規ファイル作成
3. テンプレートファイル作成（`.github/templates/`）
4. ワークフロー実装
5. このインデックスを更新
6. PR で提案

---

## 🔗 関連ドキュメント

- **WORKFLOWS_GUIDE.md**: ワークフロー全体の設計・実装
- **WORKFLOWS_QUICK_REFERENCE.md**: ワークフロー実行コマンド集
- **qa/TRACE_ANALYSIS_GUIDE.md**: Playwright トレース解析のクイックガイド

---

## 💡 ベストプラクティス

1. **スキルは再利用可能に**: 特定の PR ではなく、パターン化する
2. **テンプレートは共有**: 対応コメント・ワークフロー本文は teams で共有
3. **ドキュメント化**: スキルの目的・フロー・チェックリストを明記
4. **段階的導入**: 新スキルはまず手動実行 → CI 自動化の順

---

**最終更新**: 2026-10-12
**次回見直し**: Phase 2B 完成後
