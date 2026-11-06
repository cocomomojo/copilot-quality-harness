---
name: M2 自動実装判定
version: "1.0"
description: |
  GitHub Issue の M2 分析レポート（JSON）を入力として、
  自動実装の可否を AI が判定します。
  
  Copilot AI が以下の観点から総合的に判定：
  - セキュリティリスク（認証、暗号化、データ保護）
  - スコープ判定（Frontend / Backend / Database）
  - 複雑度評価（受入条件、テスト要求の数）
  - 情報完全性（要件の定義度）
  - 本番環境への影響度
  
usage: |
  使用例：
  
  1. コマンドラインから直接実行（Copilot CLI）
     ```bash
     copilot review --skill "m2-auto-judgment" \
       --input m2-report.json \
       --context "このIssueは自動実装可能ですか？"
     ```
  
  2. GitHub Actions ワークフロー内で実行
     ```yaml
     - name: Run M2 auto-judgment with Copilot
       run: |
         copilot review --skill "m2-auto-judgment" \
           --input ${{ runner.temp }}/m2-report.json \
           --format json --output judgment.json
     ```

author: copilot-quality-team
tags:
  - m2-workflow
  - issue-intake
  - auto-judgment
  - automation

---

# M2 自動実装判定 Skill

## 概要

このスキルは、GitHub Issue の M2 分析レポートを入力として、
AI が自動実装の可否を判定します。

## 入力

### M2 レポート (JSON)

```json
{
  "issue": {
    "title": "Issue のタイトル",
    "description": "Issue の説明",
    "acceptanceCriteria": [
      "シナリオ 1: ...",
      "シナリオ 2: ..."
    ],
    "testRequirements": [
      "テスト要求 1",
      "テスト要求 2"
    ],
    "severity": "low|medium|high|critical",
    "scope": ["Frontend", "Backend", "Database", "Infrastructure"]
  },
  "analysis": {
    "candidates": [
      {
        "path": "ファイルパス",
        "classification": "Infra|Backend|Frontend",
        "exists": true,
        "referenceValid": true
      }
    ]
  }
}
```

## 出力

### 判定結果

```json
{
  "level": "safe-proceed|needs-approval|manual-only",
  "reason": "判定理由",
  "factors": ["検出されたリスク要因のリスト"],
  "recommendation": "推奨アクション",
  "metadata": {
    "complexity": 0-10,
    "severity": "low|medium|high|critical",
    "scope": ["Frontend", ...],
    "confidence": 0.0-1.0
  }
}
```

## 判定レベル

### ✅ safe-proceed（自動実装可能）

**条件**:
- リスク要因なし
- Frontend スコープのみ
- 重大度が low または medium（ただし複雑度が低い場合）
- 情報が完全（受入条件、テスト要求が明確）
- 複雑度が中程度以下

**アクション**:
- `spec-to-implementation.yml` ワークフロー自動トリガー
- 実装 → テスト → PR 作成を自動実行

### ⚠️ needs-approval（条件付き実装可能）

**対象**:
- 重大度が高い（でも Frontend のみ）
- 複雑度が中程度（受入条件が複数、テスト要求が多い）
- 情報が部分的に不完全だが、推測で補完可能
- 軽度のセキュリティ関連（UI レベルのセキュリティなど）

**アクション**:
- Issue コメントで詳細な判定理由と推奨事項を提示
- ユーザーに確認を促す
- ユーザーが `/auto-implement` コメントで実装進行可能

### ❌ manual-only（手動判断必須）

**対象**:
- セキュリティ/認証/暗号化関連
- 個人情報/GDPR 関連
- 決済/金銭取引関連
- Backend/Database スコープ
- インフラ関連
- 情報が大幅に不足
- 複雑度が非常に高い（受入条件 > 5、テスト要求 > 10）
- 破壊的な操作（削除、スキーマ変更など）

**アクション**:
- 詳細な判定理由を明示
- 手動実装が必須である理由を説明
- 推奨される確認項目を列挙

## 判定ロジック（AI が考慮する観点）

### 1. セキュリティリスク（最優先）

AI が以下を検出した場合は即座に `manual-only`:

- 認証・認可・パスワード管理
- 暗号化・セキュアなデータ取り扱い
- セッション管理
- CSRF/XSS などの脆弱性関連
- SQL インジェクション
- 外部 API のセキュア通信

**AI の判断例**:
```
Issue: 「ユーザーがパスワード変更できる機能」

AI: セキュリティ関連のキーワードは検出されますが、
    これはあくまで UI 層での機能リクエストです。
    実際の暗号化・検証ロジックの実装が必須で、
    セキュリティレビューが必要なため manual-only。
```

### 2. スコープ判定

- **Frontend のみ**: 実装可能性あり
- **Backend 含む**: manual-only (strict/moderate モード)
- **Database スキーマ変更**: manual-only
- **インフラ**: manual-only

### 3. 複雑度評価

AI が以下から複雑度を推定:

- 受入条件の数（多い → 複雑）
- テスト要求の数（多い → 複雑）
- 関連ファイル数
- 依存関係の複雑さ
- ビジネスロジックの深さ

```
低い複雑度（0-3）: 色変更、文言修正
中程度（4-7）: 新フォーム追加、レイアウト変更
高い（8-10）: 複数コンポーネント連携、状態管理
```

### 4. 情報完全性

必須の情報が揃っているか AI が確認:

- ✓ 受入条件が 1 個以上
- ✓ テスト要求が 1 個以上
- ✓ 重大度が明示
- ✓ スコープが明確
- ✓ UI デザイン（必要に応じて）の参照

情報不足 → `manual-only` or `needs-approval`

### 5. 本番環境への影響

- **影響小**: UI 操作、表示ロジック
- **影響中**: 新機能追加、ユーザーフロー変更
- **影響大**: データ保存、API 変更、スキーマ変更

## 判定例

### 例 1: Issue #56（自動実装可能）

```json
{
  "issue": {
    "title": "【機能要望】検証用Webアプリのヘッダーナビゲーションおよびローディング表示の追加",
    "severity": "low",
    "scope": ["Frontend"],
    "acceptanceCriteria": [
      "ダーク背景のヘッダーバーが表示される",
      "ローディングアニメーションが表示される",
      "処理完了後に結果が表示される"
    ],
    "testRequirements": [
      "ヘッダーコンポーネントが正しくレンダリング",
      "ローディング状態が切り替わる"
    ]
  }
}

AI の判定:
  level: "safe-proceed"
  reason: "Frontend 限定の低リスク UI 機能です。受入条件も明確でテストプランも完備されています。"
  factors: []
  recommendation: "自動実装をトリガーし、テスト実行後に PR を作成してください。"
```

### 例 2: セキュリティ関連

```json
{
  "issue": {
    "title": "【セキュリティ】ユーザーパスワードの暗号化実装",
    "severity": "high",
    "scope": ["Backend"],
    "acceptanceCriteria": ["パスワードが暗号化される"]
  }
}

AI の判定:
  level: "manual-only"
  reason: "セキュリティとBackendの実装が含まれます。暗号化アルゴリズム、キー管理、パスワード検証ロジックなど、複数のセキュリティ考慮事項があります。"
  factors: ["security-related", "backend-changes"]
  recommendation: "以下の確認が必須です：
    1. 暗号化アルゴリズムの選定（bcrypt、Argon2など）
    2. キー管理方式
    3. セキュリティレビュー
    4. 本番環境への段階的リリース計画"
```

### 例 3: 条件付き実装

```json
{
  "issue": {
    "title": "【重要】決済画面の UI リニューアル",
    "severity": "high",
    "scope": ["Frontend"],
    "acceptanceCriteria": [
      "新デザインが実装される",
      "決済フローが変わらない",
      "セキュアな送信フォーム"
    ]
  }
}

AI の判定:
  level: "needs-approval"
  reason: "高重大度の UI 変更ですが Frontend のみです。ただし決済関連のため、以下の確認が必須です。"
  factors: ["high-severity", "payment-related"]
  recommendation: "実装前に以下を確認してください：
    1. デザイン案のビジネス承認
    2. 決済ロジックに変更がないことの確認
    3. セキュリティチームレビュー
    
    確認後、/auto-implement コメントで実装を進行"
```

## ワークフロー統合例

### m2-issue-intake.yml での使用

```yaml
- name: Run M2 auto-judgment with Copilot Skill
  id: judgment
  run: |
    copilot review --skill "m2-auto-judgment" \
      --input ${{ runner.temp }}/m2-report.json \
      --format json \
      --output /tmp/judgment.json
    
    # 結果を環境変数に設定
    LEVEL=$(jq -r '.level' /tmp/judgment.json)
    echo "JUDGMENT_LEVEL=$LEVEL" >> "$GITHUB_OUTPUT"

- name: Trigger implementation if safe-proceed
  if: steps.judgment.outputs.JUDGMENT_LEVEL == 'safe-proceed'
  run: |
    gh workflow run spec-to-implementation.yml \
      -f issue_number=${{ github.event.issue.number }}
```

## 使用上の注意

### ✅ 適切な使用法

- Issue の自動実装可否判定
- 組織のポリシーに基づく判定ルールのカスタマイズ
- チーム内での一貫した判定基準の統一

### ❌ 不適切な使用

- セキュリティ脆弱性の診断（専門家レビューが必須）
- 本番環境への自動デプロイ決定（人間の確認が必須）
- 法的・コンプライアンス判断

## トラブルシューティング

### 判定が期待と異なる場合

1. **Issue 情報を確認**: 受入条件、テスト要求が十分か
2. **スコープを確認**: Backend が含まれていないか
3. **セキュリティキーワード確認**: 誤検出の可能性

### Copilot CLI が見つからない

```bash
# インストール
npm install -g @copilot/cli

# 認証
copilot auth login

# Skill を実行
copilot review --skill "m2-auto-judgment"
```

## 関連スクリプト

- `scripts/m2-validation.mjs` - M2 分析実行
- `scripts/format-m2-report.mjs` - JSON → Markdown 変換
- `scripts/m2-auto-judgment.mjs` - ルールベース判定（フォールバック）

## サポート

問題が発生した場合は、以下をご確認ください：

1. `copilot --version` で最新版を使用
2. `.copilot/skills.json` で Skill が有効か確認
3. GitHub Issues で報告
