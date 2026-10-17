---
name: "✅ Acceptance Criteria 仕様テンプレ"
about: "Given/When/Then 形式で受け入れ基準を定義します。Copilot 自動生成用。"
labels: ["spec", "acceptance-criteria"]
---

# Issue タイトル
<!-- 例: "ユーザー登録フローの実装" -->

## 概要

### 目的
<!-- 1行で短く -->
<!-- 例: メール認証によるユーザー新規登録機能を提供する -->

### 背景
<!-- なぜ必要か（1-2行） -->
<!-- 例: 現在のシステムに登録機能がなく、ユーザーが見つけられないため -->

---

## 受け入れ基準（必須）
<!-- 複数のシナリオを列挙。各シナリオは Given/When/Then で記述 -->

### シナリオ 1: 正常系 - メール登録成功
```
Given: ログイン前のユーザー、"/signup" ページが表示
When:  メールアドレス "user@example.com" を入力して [登録] をクリック
Then:  
  - ステータスコード 201 が返される
  - "確認メールを送信しました" というメッセージが表示される
  - メール受信トレイに確認メールが届く（モック確認）
  - ユーザーステータスは "pending_verification" で DB に登録される
```

### シナリオ 2: 失敗系 - メールフォーマット不正
```
Given: ログイン前のユーザー、"/signup" ページが表示
When:  メールアドレス "invalid-email" を入力して [登録] をクリック
Then:
  - ステータスコード 400 が返される
  - エラーメッセージ "有効なメールアドレスを入力してください" が表示される
  - DB に登録されない
```

### シナリオ 3: 失敗系 - メールアドレス重複
```
Given: ログイン前のユーザー、既に "user@example.com" が登録済み、"/signup" ページが表示
When:  メールアドレス "user@example.com" を入力して [登録] をクリック
Then:
  - ステータスコード 409 が返される
  - エラーメッセージ "このメールアドレスは既に登録されています" が表示される
```

---

## 非機能要件

### パフォーマンス
- **登録 API レスポンス時間**: < 500ms（メール送信を除く）
- **確認メール送信**: 非同期実行、ユーザーには 2 秒以内に応答

### 可用性
- **SLA**: 99.9%（月間）
- **リトライポリシー**: メール送信失敗時は 3 回まで自動リトライ

### セキュリティ（必須人間確認）
- パスワード要件: 最小 8 文字、大文字・小文字・数字・記号を各 1 文字以上
- メールトークンの有効期限: 24 時間
- **❌ requires_human_approval: true** — セキュリティ要件変更は必ず人間が確認してください

---

## 除外事項
- パスワード忘れ機能（別 Issue）
- OAuth / 外部認証（別フェーズ）
- メール本文のカスタマイズ（デフォルトテンプレ固定）

---

## テスト要件（Copilot 用メタ）

### 必須 UT ケース
- [ ] `validateEmail(email: string)` - 正常系、エラー系（形式、長さ）
- [ ] `checkEmailExists(email: string)` - 既存メール、新規メール
- [ ] `hashPassword(password: string)` - ハッシュ化、ソルト確認
- [ ] `generateVerificationToken()` - トークン生成、一意性、有効期限
- [ ] `createUser(email, password)` - DB 挿入、トランザクション
- [ ] エラーハンドリング - DB 接続失敗、メール送信失敗

### 必須 E2E シナリオ
- [ ] E2E-001: 正常系の登録フロー（メール確認まで）
- [ ] E2E-002: メール形式バリデーション
- [ ] E2E-003: メール重複検知
- [ ] E2E-004: タイムアウト・ネットワーク失敗時の再試行

### 外部 API 契約
- **メール送信サービス** (`/api/email/send`)
  - リクエスト: `{ to, subject, body }`
  - レスポンス: `{ message_id, status: "sent"|"failed" }`
  - モック方針: `mock_email_service=true` で固定レスポンス返却

### データ前提（Copilot 用）
- **DB スナップショット**: `test-db-seed-user-registration.sql`（users テーブル作成済み）
- **シード値**: `seed=12345` で再現可能なテストデータを生成
- **環境変数**: `MOCK_EMAIL_SERVICE=true`, `TEST_DB_URL=...`

---

## 関連ドキュメント
- [テスト設計テンプレ](../../tests/specs/acceptance-example.yml)
- [PII フィルタ実装](../../scripts/pii-filter.ts)
- [自動マージ条件](../../.github/auto-merge-policy.md)

---

## チェックリスト（実装者用）
- [ ] 受け入れ基準をすべて実装
- [ ] UT コード (UT カバレッジ 90% 以上)
- [ ] E2E スクリプト実装 (playwright/selenium)
- [ ] trace を PR に attach
- [ ] セキュリティ要件チェック（人間承認済み）
- [ ] Draft PR 作成（Copilot 提案）
