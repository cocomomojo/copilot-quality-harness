#!/usr/bin/env node

/**
 * Copilot API クライアント
 * 
 * 目的: GitHub Copilot API と統合し、Playwright トレース解析結果から日本語の修正案を生成
 * 出力: analysis.json（構造化 JSON 形式）
 */

interface CopilotSolution {
  title: string;
  purpose: string;
  changed_files: string[];
  patch: string;
  risk: string;
  verify: string[];
  priority: 'high' | 'medium' | 'low';
}

interface CopilotAnalysis {
  summary: string;
  failing_test: string;
  failure_category: string;
  solutions: CopilotSolution[];
  generated_at: string;
}

interface TraceSummaryInput {
  failure_reason: string;
  failing_test: string;
  failing_locator: string;
  top_console_errors: string[];
  top_network_failures: string[];
  trace_excerpt: string;
  failure_category: string;
  timestamp: string;
}

/**
 * Copilot API 呼び出し用のプロンプトを構築
 */
function buildCopilotPrompt(traceSummary: TraceSummaryInput): string {
  return `
以下の Playwright テスト失敗情報から、日本語で修正案を生成してください。

## 失敗情報
- テスト名: ${traceSummary.failing_test}
- 失敗理由: ${traceSummary.failure_reason}
- 失敗ロケーター: ${traceSummary.failing_locator}
- 失敗カテゴリ: ${traceSummary.failure_category}
- エラーメッセージ: ${traceSummary.top_console_errors.join(', ')}

## トレース情報（最大2000文字）
\`\`\`
${traceSummary.trace_excerpt}
\`\`\`

## 要件
1. 日本語で簡潔な要約を3行以内で作成してください
2. 最大3案の修正案を優先度順に提示してください（各案に以下を含める）:
   - 目的（修正で解決できること）
   - 変更するファイル名（最大3個）
   - 修正コード（diff 形式のパッチ）
   - リスク（この修正による副作用の可能性）
   - 検証手順（修正後のテスト方法）
3. 優先度を high/medium/low で設定してください
4. JSON 形式で以下の構造で返してください:

\`\`\`json
{
  "summary": "要約（3行）",
  "solutions": [
    {
      "title": "修正案のタイトル",
      "purpose": "修正の目的",
      "changed_files": ["ファイル1", "ファイル2"],
      "patch": "--- a/ファイル\\n+++ b/ファイル\\n変更内容",
      "risk": "リスク説明",
      "verify": ["検証手順1", "検証手順2"],
      "priority": "high|medium|low"
    }
  ]
}
\`\`\`
`;
}

/**
 * Copilot API を呼び出す（実装例）
 * 実際の実装では GitHub Copilot API または言語モデル API を使用
 */
async function callCopilotAPI(prompt: string): Promise<CopilotAnalysis> {
  // TODO: 実装予定
  // 現在はモック実装
  
  console.warn('⚠️ Copilot API call: This is a placeholder. Real implementation required.');
  
  // これはダミー応答
  return {
    summary: '【要約】\nPlaywright のタイムアウト エラーが発生しています。\nボタンセレクターが見つからないか、ページ読み込みが遅延している可能性があります。\nwaitForSelector のタイムアウト値を増やすか、セレクター精度を向上させます。',
    failing_test: 'login_test',
    failure_category: 'timeout',
    solutions: [
      {
        title: 'waitForSelector タイムアウト値の増加',
        purpose: 'ページ読み込みが遅い場合に対応し、タイムアウト例外を防止する',
        changed_files: ['e2e/login.spec.ts'],
        patch: `--- a/e2e/login.spec.ts
+++ b/e2e/login.spec.ts
@@ -10,7 +10,7 @@
   await page.goto('/login');
-  await page.waitForSelector('button[data-testid="submit"]', { timeout: 5000 });
+  await page.waitForSelector('button[data-testid="submit"]', { timeout: 10000 });
   await page.click('button[data-testid="submit"]');`,
        risk: 'テストの実行時間が若干増加する可能性があります。ネットワーク遅延が改善されない場合、テストがさらに遅くなる恐れがあります。',
        verify: [
          'ローカルでテストを実行してタイムアウトエラーが解決したか確認',
          'CI パイプラインで複数回実行して安定性を確認',
          '他のテストのタイムアウト値も見直し、統一性を取る'
        ],
        priority: 'high'
      },
      {
        title: 'Locator API への移行',
        purpose: 'より具体的なセレクターを使用して、要素検出の信頼性を向上',
        changed_files: ['e2e/login.spec.ts'],
        patch: `--- a/e2e/login.spec.ts
+++ b/e2e/login.spec.ts
@@ -10,7 +10,8 @@
   await page.goto('/login');
-  await page.waitForSelector('button[data-testid="submit"]', { timeout: 5000 });
-  await page.click('button[data-testid="submit"]');
+  const submitBtn = page.locator('button[data-testid="submit"]');
+  await submitBtn.waitFor({ state: 'visible' });
+  await submitBtn.click();`,
        risk: 'Playwright Locator API への移行により、古いコードとの互換性が失われる可能性があります。',
        verify: [
          'Locator API で要素が正しく検出されるか確認',
          'waitFor メソッドのパラメータを確認',
          'ローカルテストで動作確認'
        ],
        priority: 'medium'
      },
      {
        title: 'ページ読み込み完了の待機',
        purpose: '明示的にページ読み込み完了を待ち、要素の描画タイミングを確保',
        changed_files: ['e2e/login.spec.ts'],
        patch: `--- a/e2e/login.spec.ts
+++ b/e2e/login.spec.ts
@@ -10,7 +10,8 @@
   await page.goto('/login');
+  await page.waitForLoadState('networkidle');
   await page.waitForSelector('button[data-testid="submit"]', { timeout: 5000 });
   await page.click('button[data-testid="submit"]');`,
        risk: 'ネットワークリクエストが多い場合、テストの実行時間が大幅に増加する可能性があります。',
        verify: [
          'waitForLoadState networkidle で期待通りに動作するか確認',
          'ネットワーク遅延がある環境でテスト',
          '他のページナビゲーションテストにも適用検討'
        ],
        priority: 'medium'
      }
    ],
    generated_at: new Date().toISOString()
  };
}

/**
 * トレース解析から修正案を生成
 */
export async function generateSuggestions(traceSummary: TraceSummaryInput): Promise<CopilotAnalysis> {
  const prompt = buildCopilotPrompt(traceSummary);
  
  console.log('🤖 Calling Copilot API...');
  console.log(`📝 Prompt:\n${prompt}\n`);

  const analysis = await callCopilotAPI(prompt);
  
  return analysis;
}

/**
 * メイン関数
 */
async function main() {
  const traceSummaryArg = process.argv[2];

  if (!traceSummaryArg) {
    console.error('Usage: ts-node scripts/copilot-client.ts <trace-summary.json>');
    process.exit(1);
  }

  try {
    const traceSummaryContent = require('fs').readFileSync(traceSummaryArg, 'utf-8');
    const traceSummary: TraceSummaryInput = JSON.parse(traceSummaryContent);

    const analysis = await generateSuggestions(traceSummary);

    // 出力先を決定
    const outputPath = traceSummaryArg.replace('trace-summary.json', 'analysis.json');
    require('fs').writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    
    console.log(`✅ Analysis saved: ${outputPath}`);
    console.log(JSON.stringify(analysis, null, 2));
  } catch (error) {
    console.error('Error generating suggestions:', error);
    process.exit(1);
  }
}

// スクリプト単体実行時のみメイン関数を実行
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { CopilotAnalysis, CopilotSolution, TraceSummaryInput };
