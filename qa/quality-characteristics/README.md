# ISO/IEC 25010 品質特性ベース テスト観点・項目生成

このディレクトリは、ISO/IEC 25010（製品品質モデル）に基づいた、テスト観点シートとテスト項目を自動生成するための仕組みです。

## 📋 概要

ISO/IEC 25010は、ソフトウェア製品の品質を評価するための8つの品質特性を定義しています。本機能は、これらの品質特性に対応するテスト観点とテスト項目を自動生成し、体系的で漏れのないテスト計画を支援します。

## 🎯 8つの品質特性

| 特性 | 説明 |
|------|------|
| **機能適合性** | ソフトウェアが指定された条件下で、指定された用途に対して、必要な機能を提供する程度 |
| **性能効率** | 使用されるリソースの量に関連した、要求された程度の性能を提供する程度 |
| **互換性** | 他のシステムとの交換可能性とシステムとの共存が可能な程度 |
| **ユーザビリティ** | 指定されたユーザーが指定された環境下で効果的かつ効率的に使用できる程度 |
| **信頼性** | 指定された時間と条件下で、指定された性能レベルを維持する程度 |
| **セキュリティ** | データと情報を保護する程度で、不正アクセスおよび使用から保護される |
| **保守性** | 欠陥を特定・除去または性能を改善するためにシステムを修正できる程度 |
| **移植性** | 異なるハードウェア、ソフトウェア環境へシステムを移行できる程度 |

## 📁 ファイル構成

```
qa/quality-characteristics/
├── iso25010-definition.yml          # ISO/IEC 25010品質特性定義
├── generated/
│   ├── test-perspectives-simple.json   # テスト観点シート（簡易モード）
│   ├── test-perspectives-detailed.json # テスト観点シート（詳細モード）
│   ├── test-items-simple.yml           # テスト項目集（簡易モード、YAML）
│   ├── test-items-simple.json          # テスト項目集（簡易モード、JSON）
│   ├── test-items-detailed.yml         # テスト項目集（詳細モード、YAML）
│   └── test-items-detailed.json        # テスト項目集（詳細モード、JSON）
└── README.md                          # このファイル
```

## 🚀 使用方法

### 1. スクリプト実行（ローカル）

**簡易モードでテスト項目を生成:**

```bash
npm run generate:quality-items -- simple
```

**詳細モードでテスト項目を生成:**

```bash
npm run generate:quality-items -- detailed qa/quality-characteristics/generated
```

**ヘルプを表示:**

```bash
npm run generate:quality-items:help
```

### 2. GitHub Actions ワークフロー実行

**Web UI から手動実行:**

1. GitHub リポジトリの `Actions` タブを開く
2. `Generate Quality Items` ワークフローを選択
3. `Run workflow` をクリック
4. モードを選択（`simple` または `detailed`）
5. `Run workflow` をクリック

**結果:**
- テスト項目が自動生成されて PR が作成されます
- PR の内容を確認して マージしてください

## 📊 生成される内容

### テスト観点シート (test-perspectives-*.json)

各品質特性に対応するテスト観点を定義したシートです。

```json
{
  "characteristic_id": "functional-suitability",
  "characteristic_name": "機能適合性",
  "description": "ソフトウェアが指定された条件下で...",
  "sub_characteristics": { ... },
  "test_perspectives": [
    "happy-path-testing",
    "boundary-value-testing",
    ...
  ],
  "expected_test_items": 6
}
```

### テスト項目集 (test-items-*.yml / test-items-*.json)

各テスト観点に対応するテスト項目の詳細です。

```yaml
testItems:
  - id: "FS-001"
    characteristic_id: "functional-suitability"
    perspective: "happy-path-testing"
    description: "正常系: 正常な入力で正しく機能することを確認"
    test_condition: "正常な入力データを提供"
    expected_result: "システムが期待通りの結果を返す"
    acceptance_criteria: "結果が仕様書の期待値と一致すること"
```

## 📈 モード別項目数

### 簡易モード（デフォルト）
- **項目数**: 1特性あたり 5～10項目
- **合計**: 約 50～80項目
- **用途**: 小規模プロジェクト、スモークテスト
- **所要時間**: テスト実行 1～2時間

### 詳細モード
- **項目数**: 1特性あたり 15～25項目
- **合計**: 約 120～200項目
- **用途**: 大規模プロジェクト、本格的なテスト
- **所要時間**: テスト実行 4～8時間

## 🔄 継続的な品質管理

### CI/CD 統合

以下のワークフローが自動的にテスト項目を活用します：

1. **quality-schedule.yml**
   - 毎週金曜日 AM 5:00 JST に自動実行
   - 品質特性ベースのテストを実行

2. **test-matrix.yml**
   - PR マージ時に複数の Node.js バージョンでテスト実行
   - テスト項目に基づいた品質検証

3. **update-dashboard.yml**
   - 毎日 AM 10:00 JST に品質ダッシュボードを更新
   - テスト結果を集計

## 📚 ISO/IEC 25010 について

ISO/IEC 25010:2023 は、以下を規定しています：

- **適用範囲**: 完成したソフトウェア製品の品質
- **構成**: 8つの特性と多くの副特性
- **メリット**: 標準化された品質評価フレームワーク
- **参考**: https://www.iso.org/standard/35733.html

## 🛠️ カスタマイズ

### 新しいテスト項目を追加

1. `scripts/generate-quality-characteristics.ts` の `testItemTemplates` を編集
2. 新しい項目定義を追加
3. スクリプトを再実行

### 品質特性の定義を変更

1. `qa/quality-characteristics/iso25010-definition.yml` を編集
2. 品質特性やテスト観点を追加/削除
3. スクリプトを再実行

## 📖 使用例

### 1. テスト計画の作成

```
$ npm run generate:quality-items -- simple

✅ テスト観点シート: qa/quality-characteristics/generated/test-perspectives-simple.json
✅ テスト項目集: qa/quality-characteristics/generated/test-items-simple.yml

生成されたテスト項目を確認してテスト計画を立案
```

### 2. テスト実装

生成されたテスト項目に基づいて、実装：

```
# 例: 機能適合性のテストケース
tests/specs/functional-suitability.yml
├── happy-path.spec.js
├── boundary-value.spec.js
├── input-validation.spec.js
└── error-handling.spec.js
```

### 3. テスト実行と品質評価

```bash
npm run test:e2e
npm run collect-kpi
npm run generate:dashboard
```

## 📊 ダッシュボード連携

生成されたテスト項目は、品質ダッシュボードと連携して以下を表示：

- 品質特性別のテスト状況
- 各特性の合格率
- テスト観点のカバレッジ
- 改善が必要な領域の特定

## ✅ テストチェックリスト

使用例：テストを実施する際のチェックリスト

- [ ] **機能適合性** - すべての機能が仕様通り動作するか
- [ ] **性能効率** - レスポンスタイムが要件を満たすか
- [ ] **互換性** - 複数環境で動作するか
- [ ] **ユーザビリティ** - ユーザーが使いやすいか
- [ ] **信頼性** - システムが安定して動作するか
- [ ] **セキュリティ** - データが保護されているか
- [ ] **保守性** - コードが保守しやすいか
- [ ] **移植性** - 別の環境にデプロイ可能か

## 🔗 関連ドキュメント

- [テスト管理ガイド](../test-management/)
- [品質ダッシュボード](../../docs/dashboard/)
- [CI/CD パイプライン](../../.github/workflows/)
- [QA ポリシー](../../docs/QA_POLICY.md)

## 📞 サポート

質問や問題がある場合：

1. GitHub Issues で報告
2. PR でコントリビューション
3. ドキュメントの改善提案

---

**自動生成**: このファイルは手動で作成され、ワークフロー実行時に更新されます。
**最終更新**: 2026-10-19
