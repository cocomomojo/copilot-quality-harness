# Contributing Guide

このドキュメントは、**Copilot による自動化を活用しながら品質を担保する開発フロー** を説明します。  
GitHub Copilot、テスト自動生成、自動マージを安全に運用するための標準的な流れと判断基準を定義しています。

---

## 🎯 目的

- 人間 1:Copilot 9 の比率を実現しながら、**品質・セキュリティ・説明責任を担保する**
- Copilot 提案の採用判定を明確化する
- Issue → テスト → 実装 → マージまでの **end-to-end フロー** を統一する
- 自動化による時間短縮と人間による最終判断のバランスを取る

---

## 📋 標準フロー（7 ステップ）

```
Issue 作成（人間）
  ↓
テスト設計（人間 60% + Copilot 40%）
  ↓
テストコード自動生成（Copilot）
  ↓
実装コード自動生成（Copilot）
  ↓
UT/E2E 自動実行（CI）
  ↓
修正提案自動生成（Copilot）
  ↓
マージ判定・実行（Copilot 90% + 人間 10%）
  ↓
KPI 監視・改善（自動化）
```

---

## 🏷️ ラベル運用

### **Copilot 関連ラベル**

| ラベル | 意味 | 用途 |
|--------|------|------|
| `copilot-generated` | Copilot が生成した PR | 自動付与（ワークフロー） |
| `auto-merge-candidate` | 自動マージ判定対象 | PR 本文に `auto_merge_candidate: true` |
| `needs-human-review` | 人間レビュー必須 | セキュリティ・リスク高の変更 |
| `requires-approval` | 承認者の明示的承認が必須 | `requires_human_approval: true` |

### **リスク分類ラベル**

| ラベル | 対象 | マージ判定 |
|--------|------|----------|
| `risk-low` | ドキュメント・format・lint 修正 | ✅ 自動マージ可 |
| `risk-medium` | UT 追加・既存テスト修正 | ⚠️ Draft PR → 人間承認後マージ |
| `risk-high` | コード変更・API・セキュリティ | ❌ 必ず人間レビュー・承認 |

---

## 👥 PR 扱いの流れ

### **Step 1: Issue 作成（人間）**

#### テンプレを使用

```markdown
# Issue タイトル: [機能名]

## 概要
- **目的**: [1行で記述]
- **背景**: [なぜ必要か]

## 受け入れ基準
### Scenario 1
- Given: [前提条件]
- When: [操作]
- Then: [期待結果]

[Scenario 2, 3 ... も記述]

## 非機能要件
- **パフォーマンス**: [要件]
- **セキュリティ**: [要件（認証・認可など）]

## ラベル
- `risk-low`, `risk-medium`, `risk-high` のいずれか
- セキュリティ影響あり → `requires-approval` を付与
```

**品質チェック（Issue 作成前に確認）**:
- [ ] Given/When/Then が具体的に書かれているか
- [ ] 非機能要件（パフォーマンス・セキュリティ）が明記されているか
- [ ] リスク分類が明示されているか

---

### **Step 2: テスト設計（人間 60% + Copilot 40%）**

#### テンプレファイル作成

```bash
# Issue が accept されたら、テスト設計ファイルを作成
cp tests/specs/example-feature.yml tests/specs/{issue-id}-{feature-name}.yml
```

#### 人間が記述すべき項目

- `feature`: 機能名
- `metadata`: リスク分類、審査要否
- `unit_tests`: テスト観点の分類（正常系・エラー系・境界値）
- `e2e_tests`: シナリオ定義（Given/When/Then のステップ化）
- `mocks`: 外部 API の隔離方針
- `seeds`: 再現性確保のシード値

#### Copilot に依頼可能な項目

```
「この tests/specs/user-registration.yml の設計をもとに、
以下のテストコードを自動生成してください：
- src/tests/unit/user.spec.ts (UT)
- tests/e2e/signup.spec.ts (E2E)
- tests/fixtures/user-mocks.ts (Mocks)」
```

Copilot が生成する → コードをレビュー → Draft PR へ

**品質チェック（テスト設計完了時）**:
- [ ] UT ケース ≥ 3 種類（正常・エラー・境界値）
- [ ] Seed 値が固定値で設定されているか
- [ ] Mock が外部 API を完全に隔離しているか
- [ ] E2E ステップが 5-10 個程度か

---

### **Step 3: テストコード自動生成（Copilot）**

```bash
npx ts-node scripts/generate-tests-from-spec.ts tests/specs/{issue-id}.yml
```

生成ファイル：
- `src/tests/unit/{feature}.spec.ts` ← 人間が TODO を埋める
- `tests/e2e/{feature}.spec.ts` ← 人間が TODO を埋める
- `tests/fixtures/{feature}-mocks.ts` ← 人間が TODO を埋める

**重要**: 生成されたコードは **placeholders が含まれています**。  
以下を必ず実装してください：

```typescript
// ❌ Before
expect(true).toBe(true); // Placeholder

// ✅ After
const result = await validateEmail('user@example.com');
expect(result).toEqual({ valid: true });
```

**品質チェック**:
- [ ] 全 TODO が埋まっているか
- [ ] `/* copilot-generated */` コメントが付いているか
- [ ] Seed 値が使用されているか（hardcoded value なし）
- [ ] Mock が正しくセットアップされているか

---

### **Step 4: 実装コード自動生成（Copilot）**

Copilot に テスト設計YAML から 実装コード生成を依頼：

```
「tests/specs/user-registration.yml をもとに、以下を生成してください：
- backend/src/controllers/user.ts (API endpoint)
- backend/src/services/email.ts (Business logic)
- frontend/src/pages/Signup.tsx (UI component)」
```

生成される内容：
- API エンドポイント骨組み
- Service/Business ロジック
- UI コンポーネント

**人間が追加すべき項目**：

- セキュリティ実装（パスワードハッシュ・入力検証・CSRF）
- エラーハンドリング（詳細なエラーメッセージ）
- 複雑なロジック・最適化

**品質チェック**:
- [ ] `/* copilot-generated */` コメントで自動生成箇所が明記されているか
- [ ] `npm run lint` でエラーなしか
- [ ] `npm run typecheck` でエラーなしか
- [ ] セキュリティ実装（認証・暗号化）が正しいか

---

### **Step 5: Draft PR 作成・レビュー**

#### 条件

```
- Branch: `feature/{issue-id}-{feature-name}`
- Draft: ✅ （自動生成物は必ず Draft で作成）
- Label: `copilot-generated` 自動付与
```

#### PR 本文に自動挿入されるメタデータ

```yaml
# Audit Metadata
copilot_generated: true
copilot_model: claude-3.5-sonnet
generated_at: 2026-10-18T10:30:00Z
trace_summary_hash: abc123...
risk_level: low
requires_human_approval: false
auto_merge_candidate: true  # リスク低の場合のみ
```

#### レビューチェックリスト

- [ ] **コード品質**
  - [ ] Lint/TypeScript strict でエラーなし
  - [ ] SAST（CodeQL）で脆弱性なし
  - [ ] 依存脆弱性（High/Critical）なし

- [ ] **テスト**
  - [ ] 全 UT 合格
  - [ ] 全 E2E 合格（隔離環境）
  - [ ] カバレッジ ≥ 90%（対象モジュール）

- [ ] **セキュリティ**（`requires_human_approval: true` の場合）
  - [ ] パスワードハッシュ（bcrypt or Argon2）
  - [ ] 入力検証（SQLi・XSS 対策）
  - [ ] トークン有効期限
  - [ ] CSRF 対策

- [ ] **機能**
  - [ ] 受け入れ基準を全て満たしているか
  - [ ] エラーハンドリングが適切か
  - [ ] ユーザーメッセージが分かりやすいか

#### コメント例

```markdown
✅ **Approved for merge** (risk-low)

Checkpoints verified:
- Lint/TypeScript/SAST: ✅ Pass
- UT/E2E: ✅ Pass (100% / 93% coverage)
- Acceptance criteria: ✅ Met
- Security: ✅ No critical issues
- Auto-merge eligible: ✅ Yes

/approve
```

---

### **Step 6: 自動マージ判定・実行**

#### 自動マージが許可される条件

```
✅ risk_level: "low"
✅ requires_human_approval: false
✅ auto_merge_candidate: true
✅ 変更タイプが低リスク（ドキュメント・format・lint のみ）
✅ 全 CI チェック合格（Lint/TypeScript/SAST/UT/Coverage）
✅ セキュリティアラート ゼロ
✅ 依存脆弱性（High/Critical）ゼロ
```

**実行方法**:

```bash
# 自動マージは GitHub Actions が実行
# 条件合致時に自動でマージ
# （人間の追加操作不要）
```

#### マージ後の監視

- **30 分間**：エラーレート監視
- **P0 アラート** 発生時に自動ロールバック実行
- **監査ログ記録**：`.github/audit/auto-merge-log.jsonl`

---

### **Step 7: KPI 監視・改善ループ**

#### 週次レポート自動生成

```bash
npm run collect-kpi
# → ops/kpi-weekly.json を出力
```

#### 監視指標

| KPI | 目標 | 警告 | 対応 |
|-----|------|------|------|
| 採用率 | 80% | < 70% | Copilot skill 調整 |
| 自動マージ成功率 | 95% | < 85% | auto-merge ポリシー見直し |
| フレーク率 | < 2% | > 5% | Mock 安定化 / セレクタ堅牢化 |
| セキュリティアラート | 0 件 | ≥ 1 件 | 即座に調査・対応 |

#### 改善ループ

```
KPI 低下 → Issue を自動作成（テンプレ付き）→ 原因分析 → 改善案実装 → 検証
```

---

## 🔒 セキュリティ実装チェックリスト

### **認証・認可**

- [ ] パスワード：bcrypt/Argon2 でハッシュ化（min 10 rounds）
- [ ] トークン：JWT は署名付き、有効期限 24 時間以内
- [ ] セッション：secure/httpOnly クッキー使用
- [ ] CORS：明示的に許可するドメインのみ

### **入力検証**

- [ ] SQL インジェクション対策：prepared statement 使用
- [ ] XSS 対策：ユーザー入力は必ずエスケープ
- [ ] CSRF 対策：state パラメータ検証（OAuth）
- [ ] ファイルアップロード：ウイルススキャン + 拡張子チェック

### **データ保護**

- [ ] PII：ログに記録しない（trace は pii-filter.ts で自動除去）
- [ ] 通信：HTTPS 必須
- [ ] DB：暗号化接続、最小権限ユーザー

### **エラーハンドリング**

- [ ] エラーメッセージに機密情報（SQL・パス・version）を含めない
- [ ] ログには詳細を記録、ユーザーには generic message

---

## 🚀 Secrets・トークン管理

### **GitHub Secrets に登録すべき項目**

```
COPILOT_SERVICE_URL      # Copilot 呼び出しサービスエンドポイント
COPILOT_SERVICE_TOKEN    # 認証トークン
AUTO_MERGE_ENABLED       # true/false で自動マージの有効化
```

### **ローテーション**

- Bot トークン：**90 日ごと** に更新
- API キー：**月 1 回** ローテーション
- 監査ログ：**6 ヶ月**間保管

---

## 📊 監査ログ保管場所

### **自動マージイベント**

```
.github/audit/auto-merge-log.jsonl
```

フォーマット：

```json
{
  "timestamp": "2026-10-18T10:30:00Z",
  "pr_number": 123,
  "pr_title": "docs: update README",
  "pr_hash": "abc123...",
  "trace_summary_hash": "def456...",
  "copilot_model": "claude-3.5-sonnet",
  "generated_at": "2026-10-18T10:00:00Z",
  "merged_at": "2026-10-18T10:30:00Z",
  "merged_by": "github-actions[bot]",
  "status": "SUCCESS"
}
```

---

## 🆘 緊急時の対応

### **自動マージ後に重大エラー検出**

1. **自動ロールバック実行** → `git revert` で自動生成
2. **新 PR 作成** → Draft 状態、人間が原因を調査
3. **チーム通知** → Slack / PagerDuty に通知
4. **本番監視強化** → 1 時間は詳細ログ監視

### **フレーク検知時**

1. **Issue 自動作成** → テンプレ付き調査 Issue
2. **自動マージ一時停止** → 該当テストの修正を待つ
3. **分析**: network vs timing vs logic
4. **修正提案**: mock 安定化 / retry 追加 / selector 堅牢化

### **セキュリティアラート発生時**

1. **即座に** `requires_human_approval: true` に設定
2. **@security に通知**
3. **自動マージ禁止**
4. **人間による審査・修正**

---

## 📞 連絡・相談先

- **開発フロー全般**: @team-lead
- **セキュリティ**: @security-team
- **テスト・QA**: @qa-team
- **Copilot 統合**: @devops-team

---

## 📚 参考ドキュメント

- [仕様テンプレ](.github/ISSUE_TEMPLATE/acceptance.md)
- [テスト設計テンプレ](tests/specs/acceptance-example.yml)
- [自動マージポリシー](.github/auto-merge-policy.md)
- [Copilot Skills](.copilot/skills.json)
- [QA ポリシー](./QA_POLICY.md)

---

**最後に**: このドキュメントは定期的に見直し、チーム全体で合意した内容を保つようにしてください。  
ご質問やご提案は、GitHub Issues で報告してください。🙏
