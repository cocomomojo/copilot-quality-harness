#!/usr/bin/env node
/**
 * M2 Auto-Judgment: M2 レポートに基づいて自動実装可否を判定
 * 
 * 判定ロジック：
 * - ✅ 自動実装可能: severity が low, test-requirements が明確, frontend-only
 * - ⚠️ 条件付き: 判定に迷う場合
 * - ❌ 手動判断必須: security/backend/db 関連、情報不足、高リスク
 * 
 * 使用例:
 *   node scripts/m2-auto-judgment.mjs --report m2-report.json
 */

import fs from 'node:fs';
import path from 'node:path';

export const JudgmentLevel = {
  SAFE_PROCEED: 'safe-proceed',       // ✅ 自動実装可能
  NEEDS_APPROVAL: 'needs-approval',   // ⚠️ 条件付き
  MANUAL_ONLY: 'manual-only'          // ❌ 手動判断必須
};

export const RiskFactors = {
  BACKEND_CHANGES: 'backend-changes',
  DB_SCHEMA: 'db-schema-changes',
  SECURITY: 'security-related',
  PERSONAL_DATA: 'personal-data',
  PAYMENT: 'payment-related',
  COMPLEX_LOGIC: 'complex-business-logic',
  MISSING_INFO: 'missing-information',
  HIGH_SEVERITY: 'high-severity',
  DESTRUCTIVE_OPS: 'destructive-operations'
};

/**
 * Issue のスコープから制限対象を検出
 */
function detectRestrictedScopes(issue) {
  const restricted = [];
  const text = `${issue.title} ${(issue.description || '')}`;
  const textLower = text.toLowerCase();
  
  // 日本語 + 英語パターンマッチング
  const patterns = {
    [RiskFactors.SECURITY]: ['セキュリティ', 'パスワード', '暗号化', '認証', 'security', 'password', 'encryption', 'auth'],
    [RiskFactors.PERSONAL_DATA]: ['個人情報', '個人データ', 'pii', 'gdpr', 'privacy', 'personal data'],
    [RiskFactors.PAYMENT]: ['決済', '支払', 'payment', 'billing', 'transaction', 'credit'],
    [RiskFactors.DB_SCHEMA]: ['データベース', 'db', 'schema', 'migration', 'ddl'],
    [RiskFactors.DESTRUCTIVE_OPS]: ['削除', 'delete', 'drop', 'truncate', 'destroy']
  };
  
  Object.entries(patterns).forEach(([factor, keywords]) => {
    if (keywords.some(kw => text.includes(kw) || textLower.includes(kw))) {
      if (!restricted.includes(factor)) {
        restricted.push(factor);
      }
    }
  });
  
  return restricted;
}

/**
 * Issue の複雑度を判定
 */
function assessComplexity(issue) {
  let complexity = 0;
  
  const criteriaCount = (issue.acceptanceCriteria || []).length;
  if (criteriaCount > 3) complexity += 2;
  if (criteriaCount > 5) complexity += 3;
  
  const testCount = (issue.testRequirements || []).length;
  if (testCount > 4) complexity += 2;
  if (testCount > 8) complexity += 3;
  
  const descriptionLength = (issue.description || '').length;
  if (descriptionLength > 1000) complexity += 1;
  
  return complexity;
}

/**
 * Issue が解析可能かを検証
 */
function validateIssueCompleteness(issue) {
  const missing = [];
  
  if (!issue.acceptanceCriteria || issue.acceptanceCriteria.length === 0) {
    missing.push('acceptance-criteria');
  }
  if (!issue.testRequirements || issue.testRequirements.length === 0) {
    missing.push('test-requirements');
  }
  if (!issue.severity) {
    missing.push('severity');
  }
  if (!issue.scope || issue.scope.length === 0) {
    missing.push('scope');
  }
  
  return missing;
}

/**
 * 自動実装の判定を実施
 */
export function judgeAutoImplementation(report, threshold = 'moderate') {
  if (!report.issue) {
    return {
      level: JudgmentLevel.MANUAL_ONLY,
      reason: 'Issue 情報が見つかりません',
      factors: [RiskFactors.MISSING_INFO],
      recommendation: 'Issue が正しく解析できていません。Issue の形式を確認してください。'
    };
  }
  
  const issue = report.issue;
  const result = {
    level: null,
    reason: null,
    factors: [],
    recommendation: null,
    metadata: {
      complexity: assessComplexity(issue),
      severity: issue.severity,
      scope: issue.scope,
      completeness: validateIssueCompleteness(issue)
    }
  };
  
  // 1️⃣ リスク要因の検出（最優先）
  const restrictedScopes = detectRestrictedScopes(issue);
  if (restrictedScopes.length > 0) {
    result.level = JudgmentLevel.MANUAL_ONLY;
    result.factors.push(...restrictedScopes);
    result.reason = `制限対象: ${restrictedScopes.join(', ')}`;
    result.recommendation = 'セキュリティ、個人情報、決済関連は手動実装が必須です';
    return result;
  }
  
  // 2️⃣ 情報の完全性チェック
  const incompleteness = validateIssueCompleteness(issue);
  if (incompleteness.length > 0) {
    result.level = JudgmentLevel.MANUAL_ONLY;
    result.factors.push(RiskFactors.MISSING_INFO);
    result.reason = `不足情報: ${incompleteness.join(', ')}`;
    result.recommendation = '受入条件、テスト要求、重大度、影響範囲を確認してください';
    return result;
  }
  
  // 3️⃣ スコープチェック（Backend/DB 制限）
  const scopeRestrictions = (issue.scope || []).filter(s => 
    ['Backend', 'Database', 'Infrastructure'].includes(s)
  );
  
  if (scopeRestrictions.length > 0) {
    result.factors.push(RiskFactors.BACKEND_CHANGES);
    if (threshold !== 'loose') {
      result.level = JudgmentLevel.MANUAL_ONLY;
      result.reason = `Backend/DB 変更が含まれます: ${scopeRestrictions.join(', ')}`;
      result.recommendation = 'Backend 変更は自動実装の対象外です';
      return result;
    }
    result.level = JudgmentLevel.NEEDS_APPROVAL;
    result.reason = `Backend スコープ含む: ${scopeRestrictions.join(', ')} (緩いモードで実装許可)`;
    result.recommendation = 'Backend 変更を含むため、CI/CD パイプラインでの検証を必須とします';
    return result;
  }
  
  // 4️⃣ 重大度チェック
  if (issue.severity === 'critical' || issue.severity === 'high') {
    result.factors.push(RiskFactors.HIGH_SEVERITY);
    if (threshold === 'strict') {
      result.level = JudgmentLevel.MANUAL_ONLY;
      result.reason = `重大度が高い: ${issue.severity}`;
      result.recommendation = '重大度が高いため、手動でのテストと検証が必要です';
      return result;
    }
    result.level = JudgmentLevel.NEEDS_APPROVAL;
    result.reason = `重大度が高い: ${issue.severity} ですが、Frontend 限定のため実装可能`;
    result.recommendation = '高重大度のため、実装後の検証を厳格に行ってください';
    return result;
  }
  
  // 5️⃣ 複雑度チェック
  const complexity = result.metadata.complexity;
  if (complexity > 10) {
    result.factors.push(RiskFactors.COMPLEX_LOGIC);
    if (threshold === 'strict') {
      result.level = JudgmentLevel.MANUAL_ONLY;
      result.reason = `複雑度が高い: ${complexity}`;
      result.recommendation = '複雑なビジネスロジックが含まれるため、手動実装を推奨します';
      return result;
    }
    result.level = JudgmentLevel.NEEDS_APPROVAL;
    result.reason = `複雑度が中程度: ${complexity}`;
    result.recommendation = '実装時に段階的テストを実施してください';
    return result;
  }
  
  // 6️⃣ 全て OK → 自動実装可能
  result.level = JudgmentLevel.SAFE_PROCEED;
  result.reason = `自動実装の条件を満たしています: ${issue.title.substring(0, 50)}...`;
  result.recommendation = `
Frontend 限定の ${issue.severity} 重大度実装です。
自動実装をトリガーし、テスト実行後に PR を作成します。
`.trim();
  
  return result;
}

// CLI エントリーポイント
if (process.argv[1].endsWith('m2-auto-judgment.mjs')) {
  const args = process.argv.slice(2);
  let reportPath = null;
  let threshold = 'moderate';
  let outputFormat = 'json';
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--report' && args[i + 1]) {
      reportPath = args[i + 1];
      i++;
    } else if (args[i] === '--threshold' && args[i + 1]) {
      threshold = args[i + 1];
      i++;
    } else if (args[i] === '--format' && args[i + 1]) {
      outputFormat = args[i + 1];
      i++;
    }
  }
  
  if (!reportPath) {
    console.error('使用例: node scripts/m2-auto-judgment.mjs --report m2-report.json [--threshold strict|moderate|loose]');
    process.exit(1);
  }
  
  if (!fs.existsSync(reportPath)) {
    console.error(`❌ ファイルが見つかりません: ${reportPath}`);
    process.exit(1);
  }
  
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const judgment = judgeAutoImplementation(report, threshold);
  
  if (outputFormat === 'json') {
    console.log(JSON.stringify(judgment, null, 2));
  } else if (outputFormat === 'env') {
    // GitHub Actions 用の環境変数出力
    console.log(`AUTO_JUDGMENT_LEVEL=${judgment.level}`);
    console.log(`AUTO_JUDGMENT_REASON=${judgment.reason.replace(/"/g, '\\"').replace(/\n/g, ' ')}`);
    console.log(`AUTO_JUDGMENT_FACTORS=${judgment.factors.join(',')}`);
  }
  
  const exitCode = {
    [JudgmentLevel.SAFE_PROCEED]: 0,
    [JudgmentLevel.NEEDS_APPROVAL]: 1,
    [JudgmentLevel.MANUAL_ONLY]: 2
  }[judgment.level] || 1;
  
  process.exit(exitCode);
}

export default judgeAutoImplementation;
