# パターンC: Copilot テスト失敗分析プロンプト

## 📊 失敗分析結果（並列処理完了）

### 失敗の分類結果
```json
{
  "unknown": {
    "count": 42,
    "percentage": "95.5",
    "examples": [
      {
        "test": "profile-created-at-User-Pr-418f6-atedAt-format-with-fallback",
        "error": "# Instructions\n\n- Following Playwright test failed.\n- Explain why, be concise, respect Playwright best practices.\n- Provide a snippet of code with the fix, if possible.\n\n# Test info\n\n- Name: profile-c"
      },
      {
        "test": "profile-created-at-User-Pr-6bf16-rofile-with-valid-createdAt",
        "error": "# Instructions\n\n- Following Playwright test failed.\n- Explain why, be concise, respect Playwright best practices.\n- Provide a snippet of code with the fix, if possible.\n\n# Test info\n\n- Name: profile-c"
      }
    ]
  },
  "network_error": {
    "count": 1,
    "percentage": "2.3",
    "examples": [
      {
        "test": "profile-created-at-User-Pr-592f0-m-API-and-display-formatted",
        "error": "# Instructions\n\n- Following Playwright test failed.\n- Explain why, be concise, respect Playwright best practices.\n- Provide a snippet of code with the fix, if possible.\n\n# Test info\n\n- Name: profile-c"
      }
    ]
  },
  "element_not_found": {
    "count": 1,
    "percentage": "2.3",
    "examples": [
      {
        "test": "profile-created-at-User-Pr-af5e4-structure-and-accessibility",
        "error": "# Instructions\n\n- Following Playwright test failed.\n- Explain why, be concise, respect Playwright best practices.\n- Provide a snippet of code with the fix, if possible.\n\n# Test info\n\n- Name: profile-c"
      }
    ]
  }
}
```

## 🎯 分析依頼

以下の 44 件のテスト失敗に対して、Copilot があなたの修正提案を生成してください。

### 【element_not_found】系（UI要素検出失敗）
失敗テスト:
- profile-created-at-User-Pr-af5e4-structure-and-accessibility

**共通原因の仮説:**
- ページ初期化の遅延
- セレクタの不正確さ
- DOM 構造の不一致

**修正提案リクエスト:**
1. セレクタの見直し提案
2. 待機条件の改善提案
3. テスト期待値の修正提案

---

### 【assertion_failure】系（期待値不一致）
失敗テスト:


**共通原因の仮説:**
- テキスト期待値の不一致
- タイミング上の競合状態
- UI ロジックの変更

**修正提案リクエスト:**
1. 各失敗の根本原因分析
2. 優先度付き修正リスト
3. 検証テスト計画

---

### 【network_error】系（ネットワーク/ブラウザエラー）
失敗テスト:
- profile-created-at-User-Pr-592f0-m-API-and-display-formatted

**共通原因の仮説:**
- GitHub Actions 環境でのブラウザ起動失敗
- バックエンドサーバー接続タイムアウト
- Playwright インストール問題

**修正提案リクエスト:**
1. 環境設定改善案
2. インストール確認スクリプト
3. 起動タイムアウト調整

---

## 📝 期待される出力形式

各修正案について以下を含める:

```
【修正提案 #N】
- タイトル: 
- 影響範囲: N 件のテスト
- 優先度: HIGH / MEDIUM / LOW
- リスク評価: 
- 実装ステップ:
  1. ...
  2. ...
- 検証方法:
  1. ...
  2. ...
- 推定実装時間: 
```

## 🔄 実行手順

1. 本プロンプトをコピー
2. Copilot チャットに貼付
3. 修正提案を取得
4. 提案を `draft-pr-from-analysis.md` に保存
5. `git apply` または手動マージ

---

**生成日時:** 2026-10-24T11:53:42.237Z
**分析対象:** 44 件の失敗テスト
**リポジトリ:** cocomomojo/copilot-quality-harness
