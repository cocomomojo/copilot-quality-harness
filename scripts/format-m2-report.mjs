#!/usr/bin/env node
/**
 * M2 Report Formatter: JSON → Markdown テーブル変換
 * JSON アーティファクトを Issue コメント用の見やすい Markdown 形式に変換します
 * 
 * 使用例:
 *   node scripts/format-m2-report.mjs --input m2-report.json --output report.md
 */

import fs from 'node:fs';
import path from 'node:path';

function escapeMarkdown(text) {
  if (!text) return '';
  return String(text)
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ');
}

function formatIssueInfo(report) {
  const issue = report.issue || {};
  const lines = [];
  
  lines.push('### Issue 要件サマリー\n');
  
  // タイトル
  if (issue.title) {
    lines.push(`**タイトル**: ${escapeMarkdown(issue.title)}\n`);
  }
  
  // 重大度と範囲
  if (issue.severity || issue.scope) {
    lines.push('| 項目 | 値 |');
    lines.push('|------|-----|');
    if (issue.severity) {
      lines.push(`| 重大度 | ${issue.severity} |`);
    }
    if (issue.scope && Array.isArray(issue.scope)) {
      lines.push(`| 影響範囲 | ${issue.scope.join(', ')} |`);
    }
    lines.push('');
  }
  
  // 受入条件（Acceptance Criteria）
  if (issue.acceptanceCriteria && Array.isArray(issue.acceptanceCriteria)) {
    lines.push('**受入条件:**\n');
    issue.acceptanceCriteria.forEach((criteria, idx) => {
      lines.push(`${idx + 1}. ${escapeMarkdown(criteria)}`);
    });
    lines.push('');
  }
  
  // テスト要求
  if (issue.testRequirements && Array.isArray(issue.testRequirements)) {
    lines.push('**テスト要求:**\n');
    issue.testRequirements.forEach((req, idx) => {
      lines.push(`${idx + 1}. ${escapeMarkdown(req)}`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}

function formatAnalysisResults(report) {
  const analysis = report.analysis || {};
  const lines = [];
  
  if (!analysis.candidates || analysis.candidates.length === 0) {
    return '';
  }
  
  lines.push('### 分析対象ファイル\n');
  lines.push('| パス | 分類 | 存在 | 参照有効 |');
  lines.push('|------|------|------|---------|');
  
  analysis.candidates.forEach(candidate => {
    const exists = candidate.exists ? '✅' : '❌';
    const valid = candidate.referenceValid ? '✅' : '❌';
    lines.push(`| \`${escapeMarkdown(candidate.path)}\` | ${candidate.classification} | ${exists} | ${valid} |`);
  });
  lines.push('');
  
  return lines.join('\n');
}

function formatRecommendations(report) {
  if (!report.handoff) {
    return '';
  }
  
  const lines = [];
  lines.push('### 推奨ブランチ\n');
  lines.push(`\`\`\`bash\ngit checkout -b ${escapeMarkdown(report.handoff.suggestedBranch)}\n\`\`\``);
  lines.push('');
  
  return lines.join('\n');
}

function formatErrors(report) {
  const errors = report.errors || [];
  const stops = report.stopConditions || [];
  const allIssues = [...errors, ...stops];
  
  if (allIssues.length === 0) {
    return '';
  }
  
  const lines = [];
  lines.push('### ⚠️ 検出事項\n');
  lines.push('| 項目 | 詳細 |');
  lines.push('|------|------|');
  
  allIssues.forEach((issue, idx) => {
    const ja = {
      'missing information: acceptance criteria, test requirements, allowed scope, severity': '不足情報',
      'missing information: acceptance criteria, test requirements, allowed scope': '不足情報',
      'missing information: acceptance criteria, test requirements': '不足情報',
      'read-only automation has not been approved for this issue': '承認不足',
      'issue mentions a restricted security, personal-data, payment, or destructive-database scope': 'スコープ制限'
    }[issue] || 'その他';
    
    lines.push(`| ${idx + 1} | ${escapeMarkdown(issue)} |`);
  });
  lines.push('');
  
  return lines.join('\n');
}

function formatReport(report) {
  const lines = [];
  
  // ヘッダー
  lines.push('# M2 Issue 分析レポート\n');
  
  const statusEmoji = {
    'ready-for-human-review': '👤',
    'safe-proceed': '✅',
    'unsafe-stop': '⛔'
  }[report.status] || '❓';
  
  lines.push(`**ステータス**: ${statusEmoji} ${report.status}\n`);
  
  // Issue 情報
  lines.push(formatIssueInfo(report));
  
  // エラーと停止条件
  lines.push(formatErrors(report));
  
  // 分析結果
  lines.push(formatAnalysisResults(report));
  
  // 推奨アクション
  lines.push(formatRecommendations(report));
  
  // メタ情報
  if (report.issue?.source?.issueUrl) {
    lines.push(`---`);
    lines.push(`\n📌 [元の Issue](${report.issue.source.issueUrl})\n`);
  }
  
  return lines.join('\n');
}

export function formatM2Report(inputPath, outputPath = null) {
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ ファイルが見つかりません: ${inputPath}`);
    process.exit(1);
  }
  
  const report = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const markdown = formatReport(report);
  
  if (outputPath) {
    fs.writeFileSync(outputPath, markdown, 'utf8');
    console.log(`✅ レポート生成: ${outputPath}`);
  }
  
  return markdown;
}

// CLI エントリーポイント
if (process.argv[1].endsWith('format-m2-report.mjs')) {
  const args = process.argv.slice(2);
  let inputPath = null;
  let outputPath = null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      inputPath = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    }
  }
  
  if (!inputPath) {
    console.error('使用例: node scripts/format-m2-report.mjs --input m2-report.json --output report.md');
    process.exit(1);
  }
  
  const markdown = formatM2Report(inputPath, outputPath);
  if (!outputPath) {
    console.log(markdown);
  }
}

export default formatM2Report;
