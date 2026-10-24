#!/usr/bin/env node

/**
 * Pattern C: Parallel Test Failure Analysis
 * 
 * 全テスト失敗の error-context.md から失敗原因を抽出・分類
 * Copilot に分析プロンプトを生成
 */

import { readdirSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname, basename } from 'path';

const TEST_RESULTS_DIR = './test-results';
const ANALYSIS_OUTPUT_DIR = './analysis-results';

function classifyFailure(errorText) {
  const lower = errorText.toLowerCase();
  
  if (lower.includes('element') || lower.includes('locator') || lower.includes('not found') || lower.includes('not visible')) {
    return 'element_not_found';
  }
  if (lower.includes('timeout') || lower.includes('exceeded') || lower.includes('time out')) {
    return 'timeout';
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('connection') || lower.includes('browser has been closed')) {
    return 'network_error';
  }
  if (lower.includes('assert') || lower.includes('expected') || lower.includes('received') || lower.includes('strict mode violation')) {
    return 'assertion_failure';
  }
  
  return 'unknown';
}

function main() {
  console.log('\n🔄 パターンC: 並列テスト失敗分析開始\n');
  
  // analysis-results ディレクトリを作成
  if (!existsSync(ANALYSIS_OUTPUT_DIR)) {
    mkdirSync(ANALYSIS_OUTPUT_DIR, { recursive: true });
  }

  // すべてのテスト結果を読み込む
  const failures = [];
  
  try {
    const dirs = readdirSync(TEST_RESULTS_DIR);
    
    for (const dir of dirs) {
      const errorContextPath = join(TEST_RESULTS_DIR, dir, 'error-context.md');
      const tracePath = join(TEST_RESULTS_DIR, dir, 'trace.zip');
      
      if (existsSync(errorContextPath)) {
        const errorText = readFileSync(errorContextPath, 'utf-8');
        const category = classifyFailure(errorText);
        
        failures.push({
          test_name: dir,
          trace_path: tracePath,
          failure_category: category,
          error_excerpt: errorText.substring(0, 200),
          full_error: errorText,
          timestamp: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.error('❌ Error reading test results:', err.message);
    process.exit(1);
  }

  // 結果を分類
  const categorized = {};
  for (const failure of failures) {
    if (!categorized[failure.failure_category]) {
      categorized[failure.failure_category] = [];
    }
    categorized[failure.failure_category].push(failure);
  }

  // サマリーを表示
  console.log('📊 失敗分類結果');
  console.log('═'.repeat(60));
  
  let totalFailed = 0;
  for (const [category, items] of Object.entries(categorized)) {
    const count = items.length;
    totalFailed += count;
    const pct = ((count / failures.length) * 100).toFixed(1);
    console.log(`\n🔴 ${category.toUpperCase()}`);
    console.log(`   件数: ${count} 件 (${pct}%)`);
    
    // 最初の3件を表示
    items.slice(0, 3).forEach((failure) => {
      console.log(`   • ${failure.test_name.substring(0, 50)}`);
    });
    if (count > 3) {
      console.log(`   ... 他 ${count - 3} 件`);
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log(`\n📈 総失敗件数: ${totalFailed} 件\n`);

  // JSON で保存
  const analysisResult = {
    summary: {
      total_analyzed: failures.length,
      total_failures: totalFailed,
      analysis_timestamp: new Date().toISOString(),
      categories: Object.keys(categorized).length
    },
    category_breakdown: Object.entries(categorized).reduce((acc, [cat, items]) => {
      acc[cat] = {
        count: items.length,
        percentage: ((items.length / failures.length) * 100).toFixed(1),
        examples: items.slice(0, 2).map(f => ({
          test: f.test_name,
          error: f.error_excerpt
        }))
      };
      return acc;
    }, {}),
    all_failures: failures
  };

  writeFileSync(
    join(ANALYSIS_OUTPUT_DIR, 'failure-classification.json'),
    JSON.stringify(analysisResult, null, 2)
  );

  // Copilot 分析プロンプトを生成
  const copilotPrompt = `# パターンC: Copilot テスト失敗分析プロンプト

## 📊 失敗分析結果（並列処理完了）

### 失敗の分類結果
\`\`\`json
${JSON.stringify(analysisResult.category_breakdown, null, 2)}
\`\`\`

## 🎯 分析依頼

以下の ${totalFailed} 件のテスト失敗に対して、Copilot があなたの修正提案を生成してください。

### 【element_not_found】系（UI要素検出失敗）
失敗テスト:
${(categorized.element_not_found || []).map(f => `- ${f.test_name}`).join('\n')}

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
${(categorized.assertion_failure || []).map(f => `- ${f.test_name}`).join('\n')}

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
${(categorized.network_error || []).map(f => `- ${f.test_name}`).join('\n')}

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

\`\`\`
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
\`\`\`

## 🔄 実行手順

1. 本プロンプトをコピー
2. Copilot チャットに貼付
3. 修正提案を取得
4. 提案を \`draft-pr-from-analysis.md\` に保存
5. \`git apply\` または手動マージ

---

**生成日時:** ${new Date().toISOString()}
**分析対象:** ${totalFailed} 件の失敗テスト
**リポジトリ:** cocomomojo/copilot-quality-harness
`;

  writeFileSync(
    join(ANALYSIS_OUTPUT_DIR, 'copilot-analysis-prompt.md'),
    copilotPrompt
  );

  console.log(`✅ 分析結果を保存:`);
  console.log(`   📄 ${join(ANALYSIS_OUTPUT_DIR, 'failure-classification.json')}`);
  console.log(`   📝 ${join(ANALYSIS_OUTPUT_DIR, 'copilot-analysis-prompt.md')}`);
  console.log(`\n🤖 Copilot 分析プロンプトの内容を以下に出力します:\n`);
  console.log(copilotPrompt);
}

main();
